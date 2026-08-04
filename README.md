# tobcalc-api

The goal of this API is to provide endpoints to fetch whatever information is necessary for [tobcalc-lib](https://github.com/samjmck/tobcalc-lib) to be able to accurately calculate the TOB (Belgian stock-exchange transaction tax) given a list of transactions from a broker. 

Currently, the required information to be able to determine the TOB is:

1. Exchange rates for a given currency and rate range from the ECB
2. Security information (name, ISIN, accumulating/distributing...) 
