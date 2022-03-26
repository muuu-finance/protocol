# Muuu Finance

## For Developer

### Launch

```bash
# Prerequisite
# - global install truffle
cd contracts

# In local development (when using ganache cli)
# Prerequisite
# - install ganache cli & launch
yarn deploy:mocks-token:local
yarn deploy:mocks-kagla:local
yarn deploy:local

# In global network
touch .secret
# & add mnemonic to .secret
truffle migrate --network shibuya
```
