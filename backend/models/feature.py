import math
import pandas as pd
import numpy as np
from typing import List, Optional, Dict
from scipy import stats
from scipy.stats import chi2_contingency
from scipy.stats import f_oneway
from datetime import datetime

# In-memory storage for features
FEATURE_CACHE = {}

class Feature:
    
    def __init__(self, name: str, data_type: str, number_missing: int, percentage_missing: float, original_dtype: str = None):
        self._name = name
        self._data_type = data_type
        self._number_missing = number_missing
        self._percentage_missing = percentage_missing
        self._original_dtype = original_dtype  # Store the original pandas dtype for reference
        self._correlated_features: List[Dict] = []
        self._informative_missingness: Dict = {"is_informative": False, "p_value": 1.0}
        self._correlations_calculated = False
        self._informative_calculated = False
        self._last_thresholds: Dict = {}
        self._last_updated = datetime.now()
        
        self._recommendation: Optional[Dict] = None
        self._recommendation_calculated = False
    
    # Getters
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def data_type(self) -> str:
        return self._data_type
    
    @property
    def number_missing(self) -> int:
        return self._number_missing
    
    @property
    def percentage_missing(self) -> float:
        return self._percentage_missing
    
    @property
    def correlated_features(self) -> List[Dict]:
        return self._correlated_features.copy()  # Return copy to prevent external modification
    
    @property
    def informative_missingness(self) -> Dict:
        return self._informative_missingness.copy()  # Return copy to prevent external modification
    
    @property
    def correlations_calculated(self) -> bool:
        return self._correlations_calculated
    
    @property
    def informative_calculated(self) -> bool:
        return self._informative_calculated
    
    @property
    def last_updated(self) -> datetime:
        return self._last_updated
    
    @property
    def original_dtype(self) -> str:
        return self._original_dtype
    
    @property
    def auto_detected_data_type(self) -> str:
        """Get the auto-detected data type based on the original pandas dtype."""
        if self._original_dtype in ['int64', 'float64']:
            return "N"
        else:
            return "C"
    
    @property
    def is_data_type_manually_set(self) -> bool:
        """Check if the data type has been manually changed from the auto-detected type."""
        return self._data_type != self.auto_detected_data_type
    
    @property
    def recommendation(self) -> Optional[Dict]:
        """Get the recommendation data."""
        return self._recommendation.copy() if self._recommendation else None
    
    @property
    def recommendation_calculated(self) -> bool:
        """Check if recommendation has been calculated."""
        return self._recommendation_calculated
    
    # Setters
    @data_type.setter
    def data_type(self, value: str):
        if value not in ("N", "C"):
            raise ValueError("Data type must be 'N' or 'C'")
        
        # Only update if the value is actually changing
        if self._data_type != value:
            self._data_type = value
            # Clear correlations for ALL features since data type change affects all correlation calculations
            for feature in FEATURE_CACHE.values():
                feature.clear_correlations()
            # Clear informative missingness since it might be affected by data type
            self._informative_calculated = False
            self._informative_missingness = {"is_informative": False, "p_value": 1.0}
            # Clear recommendation since data type change affects recommendations
            self._recommendation = None
            self._recommendation_calculated = False
            self._last_updated = datetime.now()


    def set_correlated_features(self, correlations: List[Dict]):
        """Set correlated features and mark as calculated."""
        self._correlated_features = correlations
        self._correlations_calculated = True
        # Clear recommendation since correlations affect recommendations
        self._recommendation = None
        self._recommendation_calculated = False
        self._last_updated = datetime.now()
    
    def set_informative_missingness(self, informative_data: Dict):
        """Set informative missingness data and mark as calculated."""
        self._informative_missingness = informative_data
        self._informative_calculated = True
        # Clear recommendation since informative missingness affects recommendations
        self._recommendation = None
        self._recommendation_calculated = False
        self._last_updated = datetime.now()
    
    def set_recommendation(self, recommendation_data: Dict):
        """Set recommendation data and mark as calculated."""
        self._recommendation = recommendation_data.copy()
        self._recommendation_calculated = True
        self._last_updated = datetime.now()
    
    def get_recommendation(self) -> Optional[Dict]:
        """Get recommendation data (alias for recommendation property)."""
        return self.recommendation
    
    def needs_recommendation_recalculation(self) -> bool:
        """Check if recommendation needs recalculation."""
        # Recommendation needs recalculation if:
        # 1. It hasn't been calculated yet
        # 2. Correlations or informative missingness have been recalculated since last recommendation
        return not self._recommendation_calculated
    
    def calculate_and_set_recommendation(self, dataset_mechanism: str = None):
        """Calculate recommendation using the rule engine and cache the result with error handling."""
        import logging
        
        logger = logging.getLogger(__name__)
        
        try:
            logger.debug(f"Calculating recommendation for feature: {self.name}")
            recommendation_result = calculate_recommendation(self, dataset_mechanism)
            
            if recommendation_result is not None:
                self.set_recommendation(recommendation_result)
                logger.debug(f"Successfully set recommendation for {self.name}: {recommendation_result.get('recommendation_type', 'Unknown')}")
            else:
                logger.warning(f"No recommendation calculated for feature: {self.name}")
                # Set a fallback recommendation to indicate calculation failed
                fallback_recommendation = {
                    "recommendation_type": "Machine learning algorithms that can directly handle missing data or multiple imputation",
                    "reason": f"Unable to determine specific recommendation for feature '{self.name}'. Using conservative fallback approach.",
                    "rule_applied": 4,
                    "calculation_failed": True
                }
                self.set_recommendation(fallback_recommendation)
                
        except Exception as e:
            logger.error(f"Error calculating recommendation for feature {self.name}: {str(e)}")
            # Set an error recommendation
            error_recommendation = {
                "recommendation_type": "Machine learning algorithms that can directly handle missing data or multiple imputation",
                "reason": f"Error occurred while analyzing feature '{self.name}'. Using conservative fallback approach.",
                "rule_applied": 4,
                "calculation_error": True,
                "error_message": str(e)
            }
            self.set_recommendation(error_recommendation)
    
    def clear_correlations(self):
        """Clear correlations to force recalculation with new thresholds."""
        self._correlated_features = []
        self._correlations_calculated = False
        self._last_thresholds = {}
        # Clear recommendation since correlations affect recommendations
        self._recommendation = None
        self._recommendation_calculated = False
        self._last_updated = datetime.now()
    
    def set_correlated_features_with_thresholds(self, correlations: List[Dict], thresholds: Dict):
        """Set correlated features with the thresholds used for calculation."""
        self._correlated_features = correlations
        self._correlations_calculated = True
        self._last_thresholds = thresholds.copy()
        # Clear recommendation since correlations affect recommendations
        self._recommendation = None
        self._recommendation_calculated = False
        self._last_updated = datetime.now()
    
    def should_recalculate_correlations(self, new_thresholds: Dict) -> bool:
        """Check if correlations should be recalculated based on threshold changes."""
        if not self._correlations_calculated:
            return True
        
        # Compare thresholds
        for key, value in new_thresholds.items():
            if self._last_thresholds.get(key) != value:
                return True
        
        return False
    
    def reset_to_auto_detected_type(self):
        """Reset the data type to the auto-detected value based on original dtype."""
        auto_type = self.auto_detected_data_type
        if self._data_type != auto_type:
            self.data_type = auto_type  # This will trigger the setter and clear related data
    
    def to_dict(self) -> Dict:
        """Convert feature to dictionary for API response."""
        return {
            "feature_name": self._name,
            "data_type": self._data_type,
            "original_dtype": self._original_dtype,
            "auto_detected_data_type": self.auto_detected_data_type,
            "is_data_type_manually_set": self.is_data_type_manually_set,
            "number_missing": self._number_missing,
            "percentage_missing": self._percentage_missing,
            "correlated_features": self._correlated_features,
            "informative_missingness": self._informative_missingness,
            "correlations_calculated": self._correlations_calculated,
            "informative_calculated": self._informative_calculated,
            "last_thresholds": self._last_thresholds,
            "last_updated": self._last_updated.isoformat(),
            "recommendation": self._recommendation,
            "recommendation_calculated": self._recommendation_calculated
        }
    
    def to_basic_dict(self) -> Dict:
        """Convert feature to basic dictionary for table display."""
        return {
            "feature_name": self._name,
            "data_type": self._data_type,
            "number_missing": self._number_missing,
            "percentage_missing": self._percentage_missing,
        }


def get_feature_from_cache(feature_name: str) -> Optional[Feature]:
    """Get a feature from the cache."""
    return FEATURE_CACHE.get(feature_name)


def get_all_features_from_cache() -> List[Feature]:
    """Get all features from the cache, sorted by percentage missing."""
    features = list(FEATURE_CACHE.values())
    features.sort(key=lambda x: x.percentage_missing, reverse=True)
    return features


def initialize_feature_cache(df: pd.DataFrame):
    """Initialize the feature cache with all features in the dataset. Includes comprehensive error handling."""
    import logging
    
    logger = logging.getLogger(__name__)
    global FEATURE_CACHE
    
    try:
        logger.info("Initializing feature cache")
        FEATURE_CACHE.clear()
        
        if df is None or df.empty:
            logger.error("Cannot initialize feature cache: dataframe is None or empty")
            raise ValueError("Dataframe is None or empty")
        
        features_added = 0
        features_skipped = 0
        
        for column in df.columns:
            try:
                # Validate column name
                if not column or pd.isna(column):
                    logger.warning(f"Skipping invalid column name: {column}")
                    features_skipped += 1
                    continue
                
                # Calculate missing data statistics
                try:
                    number_missing = df[column].isnull().sum()
                    
                    total_rows = len(df)
                    if total_rows == 0:
                        logger.warning(f"Skipping column {column}: dataframe has no rows")
                        features_skipped += 1
                        continue
                        
                    percentage_missing = round((number_missing / total_rows) * 100, 2)
                    
                except Exception as stats_error:
                    logger.error(f"Error calculating missing data statistics for column {column}: {str(stats_error)}")
                    features_skipped += 1
                    continue
                
                # Auto-detect data type based on pandas dtype
                try:
                    original_dtype = str(df[column].dtype)
                    data_type = "N" if df[column].dtype in ['int64', 'float64', 'int32', 'float32'] else "C"
                except Exception as dtype_error:
                    logger.warning(f"Error detecting data type for column {column}: {str(dtype_error)}. Defaulting to categorical.")
                    original_dtype = "unknown"
                    data_type = "C"
                
                # Create feature object
                try:
                    feature = Feature(
                        name=column,
                        data_type=data_type,
                        number_missing=int(number_missing),
                        percentage_missing=percentage_missing,
                        original_dtype=original_dtype
                    )
                    
                    FEATURE_CACHE[column] = feature
                    features_added += 1
                    logger.debug(f"Added feature to cache: {column} ({data_type}, {percentage_missing}% missing)")
                    
                except Exception as feature_error:
                    logger.error(f"Error creating Feature object for column {column}: {str(feature_error)}")
                    features_skipped += 1
                    continue
                    
            except Exception as column_error:
                logger.error(f"Error processing column {column}: {str(column_error)}")
                features_skipped += 1
                continue
        
        logger.info(f"Feature cache initialization complete: {features_added} features added, {features_skipped} skipped")
        
        if features_added == 0:
            if features_skipped > 0:
                raise ValueError(f"No features could be processed successfully. {features_skipped} features had errors.")
            else:
                logger.info("No features found in dataset")
        
    except Exception as e:
        logger.error(f"Critical error initializing feature cache: {str(e)}")
        FEATURE_CACHE.clear()  # Ensure cache is clean on failure
        raise


def calculate_eta(categorical_series, numerical_series):
    """Calculate Eta (η) for nominal-by-interval association."""
    try:
        # Remove missing values
        valid_mask = ~(categorical_series.isnull() | numerical_series.isnull())
        cat_valid = categorical_series[valid_mask]
        num_valid = numerical_series[valid_mask]
        
        if len(cat_valid) < 10:  # Need sufficient data
            return None, None
            
        # Group numerical values by categorical values
        groups = [group for name, group in num_valid.groupby(cat_valid)]
        
        if len(groups) < 2:  # Need at least 2 categories
            return None, None
            
        # Perform one-way ANOVA
        f_stat, p_value = f_oneway(*groups)
        
        # Calculate Eta-squared
        # η² = SS_between / SS_total
        # For one-way ANOVA: η² = F / (F + df_within)
        
        # Calculate degrees of freedom
        n_total = len(num_valid)
        k = len(groups)  # number of groups
        df_between = k - 1
        df_within = n_total - k
        
        # Calculate eta-squared
        eta_squared = f_stat / (f_stat + df_within)

        eta = math.sqrt(eta_squared)
        
        return eta, p_value
        
    except Exception as e:
        print(f"Error calculating eta: {str(e)}")
        return None, None


def calculate_feature_correlations_with_thresholds(
    df: pd.DataFrame, 
    feature_name: str, 
    pearson_threshold: float = 0.7,
    cramer_v_threshold: float = 0.7,
    eta_threshold: float = 0.7
) -> List[Dict]:
    """Calculate correlations between a feature and other features, returning those that meet thresholds."""
    try:
        if feature_name not in df.columns:
            return []
            
        correlations = []
        
        for col in df.columns:
            if col == feature_name:
                continue
                
            # Skip if either feature has no missing values (no variation)
            if df[feature_name].isnull().all() or df[col].isnull().all():
                continue
                
            feature_type = FEATURE_CACHE.get(feature_name, type('obj', (object,), {'data_type': 'C'})).data_type
            col_type = FEATURE_CACHE.get(col, type('obj', (object,), {'data_type': 'C'})).data_type
            if feature_type == 'N' and col_type == 'N':

                # Both features are numerical - use Pearson correlation
                valid_mask = ~(df[feature_name].isnull() | df[col].isnull())
                if valid_mask.sum() > 10:  # Need sufficient data
                    corr, p_value = stats.pearsonr(
                        df[feature_name][valid_mask], 
                        df[col][valid_mask]
                    )
                    if not np.isnan(corr) and abs(corr) >= pearson_threshold:
                        correlations.append({
                            "feature_name": col,
                            "correlation_value": round(corr, 3),
                            "correlation_type": "r",
                            "p_value": p_value
                        })

            elif feature_type == 'N' or col_type == 'N':
                # One numerical, one categorical - use Eta-squared
                numerical_col = df[feature_name] if feature_type == 'N' else df[col]
                categorical_col = df[feature_name] if feature_type == 'C' else df[col]


                eta, p_value = calculate_eta(categorical_col, numerical_col)
                if eta is not None and not np.isnan(eta) and eta >= eta_threshold:
                    correlations.append({
                        "feature_name": col,
                        "correlation_value": round(eta, 3),
                        "correlation_type": "η",
                        "p_value": p_value
                    })
            else:
                # Both features are categorical - use Cramer's V
                valid_mask = ~(df[feature_name].isnull() | df[col].isnull())
                if valid_mask.sum() > 10:
                    contingency_table = pd.crosstab(df[feature_name][valid_mask], df[col][valid_mask])
                    if contingency_table.shape[0] > 1 and contingency_table.shape[1] > 1:
                        chi2, p_value, dof, expected = chi2_contingency(contingency_table)
                        n = valid_mask.sum()
                        min_dim = min(contingency_table.shape) - 1
                        if min_dim > 0:
                            cramer_v = np.sqrt(chi2 / (n * min_dim))
                            if not np.isnan(cramer_v) and cramer_v >= cramer_v_threshold:
                                correlations.append({
                                    "feature_name": col,
                                    "correlation_value": round(cramer_v, 3),
                                    "correlation_type": "V",
                                    "p_value": p_value
                                })
        

        # Add this to the calculate_feature_correlations_with_thresholds function
        print(f"Feature {feature_name}: dtype={df[feature_name].dtype}, cached_type={FEATURE_CACHE.get(feature_name, {}).data_type}")

        # Sort by absolute correlation value (descending)
        correlations.sort(key=lambda x: abs(x["correlation_value"]), reverse=True)
        
        return correlations
    except Exception as e:
        print(f"Error calculating correlations for {feature_name}: {str(e)}")
        return []


def calculate_informative_missingness(df: pd.DataFrame, feature_name: str) -> Dict:
    """Calculate whether missingness of a feature is informative (placeholder implementation)."""
    # TODO: Implement proper informative missingness calculation
    # For now, return placeholder values
    return {
        "is_informative": False,  # Placeholder
        "p_value": 1.0  # Placeholder
    }


def calculate_all_recommendations(dataset_mechanism: str = None) -> Dict[str, Dict]:
    """
    Calculate recommendations for features with missing data only.
    
    Args:
        dataset_mechanism: Dataset missing data mechanism
        
    Returns:
        Dict mapping feature names to their recommendation results (None for failed calculations)
    """
    import logging
    
    logger = logging.getLogger(__name__)
    recommendations = {}
    
    if not FEATURE_CACHE:
        logger.error("Feature cache is empty - cannot calculate recommendations")
        return {}
    
    successful_calculations = 0
    failed_calculations = 0
    features_with_missing = 0
    
    for feature_name, feature in FEATURE_CACHE.items():
        try:
            # Only process features that have missing data
            if feature.number_missing == 0:
                logger.debug(f"Skipping feature {feature_name} - no missing data")
                continue
                
            features_with_missing += 1
            
            if feature.needs_recommendation_recalculation():
                logger.debug(f"Calculating recommendation for feature: {feature_name}")
                feature.calculate_and_set_recommendation(dataset_mechanism)
            
            recommendation = feature.get_recommendation()
            recommendations[feature_name] = recommendation
            
            if recommendation is not None:
                successful_calculations += 1
                logger.debug(f"Successfully calculated recommendation for {feature_name}: {recommendation.get('recommendation_type', 'Unknown')}")
            else:
                failed_calculations += 1
                logger.warning(f"No recommendation generated for feature: {feature_name}")
                
        except Exception as e:
            failed_calculations += 1
            logger.error(f"Error calculating recommendation for feature {feature_name}: {str(e)}")
            recommendations[feature_name] = None
    
    logger.info(f"Recommendation calculation summary: {features_with_missing} features with missing data, {successful_calculations} successful, {failed_calculations} failed")
    
    return recommendations


def group_recommendations_by_type(recommendations: Dict[str, Dict]) -> List[Dict]:
    """
    Group features by their recommendation type for API response with proper grammar handling.
    
    Args:
        recommendations: Dict mapping feature names to recommendation results
        
    Returns:
        List of dicts with recommendation_type, features, and reason (with proper grammar)
    """
    grouped = {}
    
    for feature_name, recommendation in recommendations.items():
        if not recommendation:
            continue
            
        rec_type = recommendation["recommendation_type"]
        reason = recommendation["reason"]
        
        if rec_type not in grouped:
            grouped[rec_type] = {
                "recommendation_type": rec_type,
                "features": [],
                "reason": reason
            }
        
        grouped[rec_type]["features"].append(feature_name)
    
    # Convert to list and adjust grammar based on feature count
    result = []
    for rec_data in grouped.values():
        feature_count = len(rec_data["features"])
        original_reason = rec_data["reason"]
        
        # Adjust grammar for singular vs plural features
        adjusted_reason = adjust_reason_grammar(original_reason, feature_count)
        rec_data["reason"] = adjusted_reason
        
        result.append(rec_data)
    
    # Sort by the first feature's rule number (we can get this from the cache)
    def get_rule_priority(rec_data):
        # Get the rule number from the first feature with this recommendation
        first_feature_name = rec_data["features"][0]
        feature = FEATURE_CACHE.get(first_feature_name)
        if feature and feature.recommendation:
            return feature.recommendation.get("rule_applied", 999)
        return 999
    
    result.sort(key=get_rule_priority)
    
    return result


def adjust_reason_grammar(reason: str, feature_count: int) -> str:
    """
    Adjust the grammar of reason text based on the number of features.
    
    Args:
        reason: Original reason text (written for multiple features)
        feature_count: Number of features this reason applies to
        
    Returns:
        Grammatically correct reason text
    """
    if feature_count == 1:
        # Convert plural to singular for specific patterns
        adjustments = [
            # Rule 1: Informative missingness
            ("These numerical features likely have informative missingness.", 
             "This numerical feature likely has informative missingness."),
            
            # Rule 2: Strong correlation
            ("These features with missing data are strongly correlated with features with complete data. Missing values can be predicted from correlated features, making removal viable.", 
             "This feature with missing data is strongly correlated with features with complete data. Missing values can be predicted from correlated features, making removal viable."),
            
            # Rule 3: Categorical features
            ("An 'unknown' category can replace missing data for categorical features. If it is an ordinal feature, also consider adjusting the categories", 
             "An 'unknown' category can replace missing data for this categorical feature. If it is an ordinal feature, also consider adjusting the categories."),
            ("categorical features", "this categorical feature"),
            
            # Fallback reasons
            ("For categorical features, consider creating", 
             "For this categorical feature, consider creating"),
            ("For numerical features, advanced methods", 
             "For this numerical feature, advanced methods"),
            
            # General patterns (order matters - more specific first)
            ("These features", "This feature"),
            ("these features", "this feature"),
            ("numerical features", "this numerical feature"),
            ("are strongly correlated", "is strongly correlated"),
            ("have informative", "has informative"),
        ]
        
        adjusted_reason = reason
        for plural_form, singular_form in adjustments:
            adjusted_reason = adjusted_reason.replace(plural_form, singular_form)
        
        # Ensure proper punctuation
        if not adjusted_reason.endswith('.'):
            adjusted_reason += '.'
            
        return adjusted_reason
    else:
        # Text is already written for multiple features, but ensure proper punctuation
        if not reason.endswith('.'):
            reason += '.'
        return reason


# Recommendation Rule Engine

def _has_informative_missingness(feature: Feature) -> bool:
    """Rule 1 helper: Check if feature has informative missingness."""
    if not feature.informative_calculated:
        return False
    return feature.informative_missingness.get("is_informative", False)


def _is_strongly_correlated(feature: Feature) -> bool:
    """Rule 2 helper: Check if feature is strongly correlated with complete features."""
    if not feature.correlations_calculated:
        return False
    # A feature is considered strongly correlated if it has any correlations above threshold
    return len(feature.correlated_features) > 0


def _is_categorical_feature(feature: Feature) -> bool:
    """Rule 3 helper: Check if feature is categorical."""
    return feature.data_type == "C"


def _is_numerical_feature(feature: Feature) -> bool:
    """Helper: Check if feature is numerical."""
    return feature.data_type == "N"


def _is_mar_or_mnar_mechanism(dataset_mechanism: str) -> bool:
    """Rule 4 helper: Check if dataset mechanism is MAR or MNAR."""
    if not dataset_mechanism:
        return False
    mechanism_lower = dataset_mechanism.lower()
    return "mar" in mechanism_lower or "mnar" in mechanism_lower


def _is_mcar_mechanism(dataset_mechanism: str) -> bool:
    """Rule 5 helper: Check if dataset mechanism is MCAR."""
    if not dataset_mechanism:
        return False
    return "mcar" in dataset_mechanism.lower()


def _get_mechanism_explanation(dataset_mechanism: str) -> str:
    """Helper: Get detailed explanation for dataset missing data mechanism."""
    if not dataset_mechanism:
        return ""
    
    mechanism_lower = dataset_mechanism.lower()
    
    if "mcar" in mechanism_lower:
        return "(Missing Completely at Random)"
    elif "mar" in mechanism_lower and "mnar" in mechanism_lower:
        return "(Missing at Random or Missing Not at Random)"
    elif "mar" in mechanism_lower:
        return "(Missing at Random)"
    elif "mnar" in mechanism_lower:
        return "(Missing Not at Random)"
    else:
        return ""


def get_cached_missing_mechanism_from_request(request) -> Optional[str]:
    """
    Helper function to get cached missing data mechanism from request app state.
    Returns the mechanism acronym or None if not available.
    """
    try:
        # Import here to avoid circular imports
        from routes.dashboard_routes import get_cached_missing_mechanism
        
        mechanism_data = get_cached_missing_mechanism(request)
        if mechanism_data and mechanism_data.get("success"):
            return mechanism_data.get("mechanism_acronym")
        return None
    except Exception:
        return None


def calculate_recommendation(feature: Feature, dataset_mechanism: str = None) -> Dict:
    """
    Calculate recommendation for a feature based on the 5 rules in order of precedence.
    Includes comprehensive error handling and fallback behavior.
    
    Rules (in order):
    1. Informative missingness -> Missing-indicator method
    2. Strong correlation (no informative missingness) -> Remove Features  
    3. Categorical + no correlation + no informative missingness -> Unknown category
    4. MAR/MNAR mechanism -> ML algorithms/imputation
    5. MCAR mechanism -> All methods valid
    
    Args:
        feature: Feature object with calculated correlations and informative missingness
        dataset_mechanism: Dataset missing data mechanism ("MCAR", "MAR", "MNAR", etc.)
    
    Returns:
        Dict with recommendation_type, reason, and rule_applied, or None if calculation fails
    """
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Validate feature object
        if not feature or not hasattr(feature, 'name'):
            logger.error("Invalid feature object provided")
            return None
        
        feature_name = feature.name
        logger.debug(f"Calculating recommendation for feature: {feature_name}")
        
        # Rule 1: Informative missingness (highest priority)
        try:
            if _has_informative_missingness(feature):
                reason = "These numerical features likely have informative missingness."
                logger.debug(f"Applied Rule 1 (informative missingness) for {feature_name}")
                return {
                    "recommendation_type": "Missing-indicator method",
                    "reason": reason,
                    "rule_applied": 1
                }
        except Exception as e:
            logger.warning(f"Error checking informative missingness for {feature_name}: {str(e)}")
            # Continue to next rule
        
        # Rule 2: Strong correlation with complete features (no informative missingness)
        try:
            if _is_strongly_correlated(feature):
                reason = "These features with missing data are strongly correlated with features with complete data. Missing values can be predicted from correlated features, making removal viable."
                
                logger.debug(f"Applied Rule 2 (strong correlation) for {feature_name}")
                return {
                    "recommendation_type": "Remove Features", 
                    "reason": reason,
                    "rule_applied": 2
                }
        except Exception as e:
            logger.warning(f"Error checking correlations for {feature_name}: {str(e)}")
            # Continue to next rule
        
        # Rule 3: Categorical feature with non-informative missingness and no strong correlations
        try:
            if _is_categorical_feature(feature):
                reason = "An 'unknown' category can replace missing data for categorical features. If it is an ordinal feature, also consider adjusting the categories"
                logger.debug(f"Applied Rule 3 (categorical feature) for {feature_name}")
                return {
                    "recommendation_type": "Create an 'unknown' category or consider adjusting the categories",
                    "reason": reason,
                    "rule_applied": 3
                }
        except Exception as e:
            logger.warning(f"Error checking feature type for {feature_name}: {str(e)}")
            # Continue to next rule
        
        # Rule 4: MAR/MNAR dataset mechanism
        try:
            if _is_mar_or_mnar_mechanism(dataset_mechanism):
                mechanism_explanation = _get_mechanism_explanation(dataset_mechanism)
                reason = f"Since your data is {mechanism_explanation}, imputing missing data with mean, median, or mode will likely introduce bias. Consider the alternatives instead."
                logger.debug(f"Applied Rule 4 (MAR/MNAR mechanism) for {feature_name}")
                return {
                    "recommendation_type": "Machine learning algorithms that can directly handle missing data or multiple imputation",
                    "reason": reason,
                    "rule_applied": 4
                }
        except Exception as e:
            logger.warning(f"Error checking MAR/MNAR mechanism for {feature_name}: {str(e)}")
            # Continue to next rule
        
        # Rule 5: MCAR dataset mechanism
        try:
            if _is_mcar_mechanism(dataset_mechanism):
                mechanism_explanation = _get_mechanism_explanation(dataset_mechanism)
                reason = f"Since your data is {mechanism_explanation}, all missing data treatment methods are valid."
                logger.debug(f"Applied Rule 5 (MCAR mechanism) for {feature_name}")
                return {
                    "recommendation_type": "All methods are valid: complete case analysis, machine learning algorithms that can directly handle missing data, multiple imputation, etc.",
                    "reason": reason,
                    "rule_applied": 5
                }
        except Exception as e:
            logger.warning(f"Error checking MCAR mechanism for {feature_name}: {str(e)}")
            # Continue to fallback
        
        # Fallback logic
        try:
            # Determine fallback based on available information
            fallback_reason = "Dataset missing data mechanism could not be determined."
            
            # Try to provide more specific fallback based on feature type
            if hasattr(feature, 'data_type'):
                if feature.data_type == "C":
                    fallback_reason += " For categorical features, consider creating an 'unknown' category or using advanced imputation methods."
                elif feature.data_type == "N":
                    fallback_reason += " For numerical features, advanced methods like machine learning algorithms or multiple imputation are recommended."
                else:
                    fallback_reason += " Advanced methods are recommended as a safe default."
            else:
                fallback_reason += " Advanced methods are recommended as a safe default to handle potential systematic missing data patterns."
            
            logger.debug(f"Applied fallback recommendation for {feature_name}")
            return {
                "recommendation_type": "Machine learning algorithms that can directly handle missing data or multiple imputation",
                "reason": fallback_reason,
                "rule_applied": 4  # Default to rule 4 as conservative approach
            }
            
        except Exception as fallback_error:
            logger.error(f"Error in fallback recommendation for {feature_name}: {str(fallback_error)}")
            return None
        
    except Exception as e:
        logger.error(f"Unexpected error calculating recommendation for feature {getattr(feature, 'name', 'unknown')}: {str(e)}")
        return None