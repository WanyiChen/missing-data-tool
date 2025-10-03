import pandas as pd
import numpy as np
from scipy.stats import ttest_ind, chi2_contingency
from scipy.stats.contingency import crosstab
from statsmodels.stats.multitest import multipletests

def run_selective_mim(dataframe, target_col, target_type, alpha=0.05):
    """
    Function to test if missing data is informative using statistical tests.
    Uses t-test for numerical targets and chi-square for categorical targets.
    Then applies FDR correction to account for multiple testing.
    """
    
    # Split data into target and features
    y = dataframe[target_col]
    X = dataframe.drop(columns=[target_col])
    
    # Initialize lists to store results
    pvals = []
    features_tested = []
    
    # Loop through each feature to test
    for col in X.columns:
        feature = X[col]
        
        # Skip features with no missing data
        if feature.isnull().sum() == 0:
            print(f"Skipping {col} because it has no missing values")
            continue
        
        # Create binary flag: 1 if missing, 0 if present
        missing_flag = feature.isnull().astype(int)
        
        # Test based on target type
        if target_type == "numerical":
            # Split target into groups based on missingness
            group0 = y[missing_flag == 0]
            group1 = y[missing_flag == 1]
            
            # Need at least 2 observations in each group for t-test
            if len(group0) < 2 or len(group1) < 2:
                print(f"Not enough data to compare groups for {col}")
                continue
            
            # Run Welch's t-test (doesn't assume equal variance)
            stat_result = ttest_ind(group0, group1, equal_var=False)
            pval = stat_result.pvalue
            print(f"T-test p-value for {col}: {pval}")
            
        elif target_type == "categorical":
            # Create contingency table for chi-square test
            _, table = crosstab(missing_flag, y)
            
            # Need at least 2x2 table for chi-square
            if table.shape[0] < 2 or table.shape[1] < 2:
                print(f"Contingency table invalid for {col}")
                continue
            
            # Run chi-square test of independence
            stat, pval, dof, expected = chi2_contingency(table)
            print(f"Chi-square p-value for {col}: {pval}")
            
        else:
            print(f"Invalid target_type: {target_type}")
            continue
        
        # Skip if p-value is invalid
        if np.isnan(pval) or np.isinf(pval):
            print(f"Invalid p-value for {col}: {pval}, skipping")
            continue
        
        # Store results
        pvals.append(pval)
        features_tested.append(col)
    
    # Handle case where no features were tested
    if len(pvals) == 0:
        print("No features were tested. Exiting.")
        return []
    
    # Apply Benjamini-Hochberg FDR correction
    # This adjusts p-values to account for testing multiple features
    reject_flags, corrected_pvals, _, _ = multipletests(pvals, alpha=alpha, method="fdr_bh")
    
    # Build final results
    results = []
    for i in range(len(features_tested)):
        results.append({
            "feature": features_tested[i],
            "p_value": corrected_pvals[i],
            "is_informative": bool(reject_flags[i])
        })
    
    return results