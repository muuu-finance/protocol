import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { request, gql } from 'graphql-request'
import { JsonRpcProvider } from '@ethersproject/providers'
import BigNumberJs from 'bignumber.js'
import { BigNumber } from 'ethers'

// Constants
const HOUR = 60 * 60 // in minute
const DAY = HOUR * 24
const WEEK = DAY * 7

const URL = 'https://hub.snapshot.org/graphql'
const SPACE = 'muuu.eth'

// Interfaces
// - GraphQL
type Proposal = {
  id: string
  title: string
  state: string
  start: number
  end: number
  snapshot: string
  choices: string[]
  scores: number[]
  scores_total: number
  scores_updated: number
}
type Response = {
  proposals: Proposal[]
}
// - Original
type VoteResult = {
  label: string
  value: string
  ratio: string
  processedRatio2: string
  processedRatio3: string
  current: string
}

// Utilities
const getProposalsFromSnapshot = async (rangeStartTime: {
  start: number
  end: number
}) => {
  const query = gql`
    query Proposals($space: String!, $startGte: Int!, $startLte: Int!) {
      proposals(
        first: 1
        where: {
          space: $space
          state: "closed"
          start_gte: $startGte
          start_lte: $startLte
        }
        orderBy: "created"
        orderDirection: desc
      ) {
        id
        title
        state
        start
        end
        snapshot
        choices
        scores
        scores_total
        scores_updated
      }
    }
  `
  const variables = {
    space: SPACE,
    startGte: rangeStartTime.start,
    startLte: rangeStartTime.end,
  }
  return (await request(URL, query, variables)) as Response
}

const convertProposalForUser = (obj: Proposal) => {
  const _obj = JSON.parse(JSON.stringify(obj)) as {
    results: VoteResult[]
    choices?: string[]
    scores?: number[]
    start: {
      timestamp: number
      iso: string
    }
    end: {
      timestamp: number
      iso: string
    }
    scores_updated: {
      timestamp: number
      iso: string
    }
  } & Omit<Proposal, 'choices' | 'scores' | 'start' | 'end' | 'scores_updated'>
  delete _obj.choices
  delete _obj.scores
  _obj.results = obj.choices.map((_label, idx) => {
    const score = new BigNumberJs(obj.scores[idx])
    const total = new BigNumberJs(obj.scores_total)
    const ratio = score.dividedBy(total)
    return {
      label: _label,
      value: score.toString(),
      ratio: ratio.toString(),
      processedRatio2: ratio.multipliedBy(100).toFixed(2).toString(),
      processedRatio3: ratio.multipliedBy(100).toFixed(3).toString(),
      current: ratio.multipliedBy(100).toFixed(3).toString(),
    }
  })
  const toISOfromTimestamp = (t: number) => new Date(t * 1000).toISOString()
  _obj.start = {
    timestamp: obj.start,
    iso: toISOfromTimestamp(obj.start),
  }
  _obj.end = {
    timestamp: obj.end,
    iso: toISOfromTimestamp(obj.end),
  }
  _obj.scores_updated = {
    timestamp: obj.scores_updated,
    iso: toISOfromTimestamp(obj.scores_updated),
  }
  return _obj
}

const currentTimestamp = async (provider: JsonRpcProvider) => {
  const currentBlockNumber = await provider.getBlockNumber()
  const block = await provider.getBlock(currentBlockNumber)
  return {
    timestamp: block.timestamp,
    date: new Date(block.timestamp * 1000),
  }
}

const getPoolIdFromLabel = (label: string): number => {
  if (label === '3Pool') return 3
  if (label === 'Starlay 3Pool') return 4
  if (label === 'BUSD+3KGL') return 5
  if (label === 'BAI+3KGL') return 6
  if (label === 'oUSD+3KGL') return 7
  return 0
}

// Main
task('get-vote-gauge-weight', 'get-vote-gauge-weight').setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre
    const current = await currentTimestamp(ethers.provider)
    console.log(`Now: ${current.date.toISOString()}`)
    const currentTerm = Math.floor(current.timestamp / WEEK) * WEEK

    // Get snapshot result
    const res = await getProposalsFromSnapshot({
      start: currentTerm,
      end: currentTerm + DAY,
    })

    // validate & convert
    if (res.proposals.length !== 1)
      throw new Error(
        `Exist one or more proposals: length = ${res.proposals.length}`,
      )
    const proposal = convertProposalForUser(res.proposals[0])
    console.log(`## Target Proposal (converted)`)
    console.log(proposal)
    const raw: VoteResult[] = proposal.results

    // Consider overflow
    let overflowTotal = new BigNumberJs(0)
    const afterOverflow: (VoteResult & { overflow: string })[] = raw.map(
      (v) => {
        const border = new BigNumberJs(50)
        const ratio = new BigNumberJs(v.processedRatio3)
        if (ratio.isGreaterThan(border)) {
          const overflow = ratio.minus(border)
          overflowTotal = overflowTotal.plus(overflow)
          return {
            ...v,
            overflow: overflow.toString(),
            current: border.toString(),
          }
        }
        return {
          ...v,
          overflow: new BigNumberJs(0).toString(),
        }
      },
    )
    // For Debug
    // console.log("## afterOverflow")
    // console.log(afterOverflow)

    // Consider insufficient
    let insufficientTotal = new BigNumberJs(0)
    const afterLowerLimit: (typeof afterOverflow[number] & {
      insufficient: string
    })[] = afterOverflow.map((v) => {
      const border = new BigNumberJs(1)
      const ratio = new BigNumberJs(v.processedRatio3)
      if (ratio.isLessThan(border)) {
        const insufficient = border.minus(ratio)
        insufficientTotal = insufficientTotal.plus(insufficient)
        return {
          ...v,
          insufficient: insufficient.toString(),
          current: border.toString(),
        }
      }
      return {
        ...v,
        insufficient: new BigNumberJs(0).toString(),
      }
    })
    // For Debug
    // console.log("## afterLowerLimit")
    // console.log(afterLowerLimit)

    const totalRatioInRange = afterLowerLimit.reduce((pv, cv) => {
      const _overflow = new BigNumberJs(cv.overflow)
      const _insufficient = new BigNumberJs(cv.insufficient)
      if (_overflow.isZero() && _insufficient.isZero()) {
        return pv.plus(new BigNumberJs(cv.processedRatio3))
      }
      return pv
    }, new BigNumberJs(0))

    const adjustingValue = overflowTotal.minus(insufficientTotal)
    const calcurated = afterLowerLimit.map((v) => {
      const _overflow = new BigNumberJs(v.overflow)
      const _insufficient = new BigNumberJs(v.insufficient)
      if (_overflow.isZero() && _insufficient.isZero()) {
        const _adjustingValue = adjustingValue
          .multipliedBy(new BigNumberJs(v.current))
          .dividedBy(totalRatioInRange)
        return {
          ...v,
          current: new BigNumberJs(v.current).plus(_adjustingValue).toString(),
        }
      }
      return v
    })
    // For Debug
    // console.log("## calcurated")
    // console.log(calcurated)

    // Process results
    const results = calcurated.map((v) => ({
      label: v.label,
      poolId: getPoolIdFromLabel(v.label),
      current: v.current,
      fixed: new BigNumberJs(v.current).toFixed(2).toString(),
    }))
    console.log('## results')
    console.log(results)
    // console.log(`total current: ${results.reduce((pv, cv) => pv.plus(new BigNumberJs(cv.current)), new BigNumberJs(0)).toString()}`)
    console.log(
      `total fixed: ${results
        .reduce(
          (pv, cv) => pv.plus(new BigNumberJs(cv.fixed)),
          new BigNumberJs(0),
        )
        .toString()}`,
    )
    const output = results.reduce((pv, cv, index) => {
      const key = cv.poolId ? cv.poolId : `0-${index}` // consider to no poolId (cannot get from label)
      pv[key] = new BigNumberJs(cv.fixed).shiftedBy(2).toNumber()
      return pv
    }, {} as { [key in any]: number })
    console.log(`## output`)
    console.log(output)
    return output
  },
)
