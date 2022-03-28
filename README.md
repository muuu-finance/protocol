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
cp .env.template .env
# & add params to .env
truffle migrate --network shibuya
```
