# V3 synthetic drive fixtures

Both CSVs are generated from `lib/obd/drive-demo.ts`. They are **synthetic mathematical examples, not real-device exports**. Each contains 161 rows at 0.5 s spacing over 80 elapsed seconds. B uses a different original time origin (900000 s); the analyzer normalizes each run independently.

The input profile has stopped speed, idle RPM, a speed ramp, steady cruise, a falling speed ramp, then idle. Conservative boundary/minimum-duration rules deliberately leave some transitions unclassified. The selected cruise segment is 35–55 s in both runs. LTFT Bank 1 is 10.8% in A and 4.3% in B; the median difference is −6.5 percentage points. Other conditions are identical. MAF is `RPM × 0.005 + 2` for known relationship ground truth; this is not a physical engine model.

Manual review: upload `synthetic-baseline.csv` as A and accept mapping; expand A/B comparison, upload `synthetic-comparison.csv` as B and accept mapping; select cruise for both, then compare. Select acceleration in A and RPM versus MAF for Pearson approximately +1. The tests also generate asynchronous, sparse, noisy, duplicate-time and incompatible-context data inline.
