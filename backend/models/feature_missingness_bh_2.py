"""
import pandas as pd
import numpy as np
from scipy.stats import ttest_ind, chi2_contingency
from scipy.stats.contingency import crosstab
from statsmodels.stats.multitest import multipletests

def run_selective_mim(dataframe, target_col, target_type, alpha=0.05):

    y = dataframe[target_col]
    X = dataframe.drop(columns=[target_col])

    pvals = []
    features_tested = []

    for col in X.columns:
        feature = X[col]

        if feature.isnull().sum() == 0:
            print(f"Skipping {col} because it has no missing values")
            continue

        #print(f"Checking {col} for informative missingness...")
        missing_flag = feature.isnull().astype(int)

        #pval = 1.0  # default in case of issues

        if target_type == "numerical":
            group0 = y[missing_flag == 0]
            group1 = y[missing_flag == 1]

            if len(group0) < 2 or len(group1) < 2:
                print(f"Not enough data to compare groups for {col}")
            else:
                stat_result = ttest_ind(group0, group1, equal_var=False)
                pval = stat_result.pvalue
                print(f"T-test p-value for {col}: {pval}")

        elif target_type == "categorical":
            _, table = crosstab(missing_flag, y)
            if table.shape[0] < 2 or table.shape[1] < 2:
                print(f"Contingency table invalid for {col}")
            else:
                stat, pval, dof, expected = chi2_contingency(table)
                print(f"Chi-square p-value for {col}: {pval}")

        else:
            print(f"Invalid target_type: {target_type}")
            continue

        pvals.append(pval)
        features_tested.append(col)

    if len(pvals) == 0:
        print("No features were tested. Exiting.")
        return []

    reject_flags, corrected_pvals, _, _ = multipletests(pvals, alpha=alpha, method="fdr_bh")

    results = []
    for i in range(len(features_tested)):
        results.append({
            "feature": features_tested[i],
            "p_value": pvals[i],
            "is_informative": bool(reject_flags[i])
        })

    return results
"""
import pandas as pd
import numpy as np
from scipy.stats import ttest_ind, chi2_contingency
from scipy.stats.contingency import crosstab
from statsmodels.stats.multitest import multipletests

def run_selective_mim(dataframe, target_col, target_type, alpha=0.05):

    y = dataframe[target_col]
    X = dataframe.drop(columns=[target_col])

    pvals = []
    features_tested = []

    for col in X.columns:
        feature = X[col]

        if feature.isnull().sum() == 0:
            print(f"Skipping {col} because it has no missing values")
            continue

        missing_flag = feature.isnull().astype(int)

        if target_type == "numerical":
            group0 = y[missing_flag == 0]
            group1 = y[missing_flag == 1]

            if len(group0) < 2 or len(group1) < 2:
                print(f"Not enough data to compare groups for {col}")
                continue  # ADD THIS
            
            stat_result = ttest_ind(group0, group1, equal_var=False)
            pval = stat_result.pvalue
            print(f"T-test p-value for {col}: {pval}")

        elif target_type == "categorical":
            _, table = crosstab(missing_flag, y)
            if table.shape[0] < 2 or table.shape[1] < 2:
                print(f"Contingency table invalid for {col}")
                continue  # ADD THIS
            
            stat, pval, dof, expected = chi2_contingency(table)
            print(f"Chi-square p-value for {col}: {pval}")

        else:
            print(f"Invalid target_type: {target_type}")
            continue

        # ADD THIS ERROR CHECK
        if np.isnan(pval) or np.isinf(pval):
            print(f"Invalid p-value for {col}: {pval}, skipping")
            continue

        pvals.append(pval)
        features_tested.append(col)

    if len(pvals) == 0:
        print("No features were tested. Exiting.")
        return []

    reject_flags, corrected_pvals, _, _ = multipletests(pvals, alpha=alpha, method="fdr_bh")

    results = []
    for i in range(len(features_tested)):
        results.append({
            "feature": features_tested[i],
            "p_value": corrected_pvals[i],  # CHANGE: Use corrected p-values
            "is_informative": bool(reject_flags[i])
        })

    return results