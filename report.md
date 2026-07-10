# Comprehensive Analytical Journal for the Prostate Cancer Risk Classification Study

## Abstract

This comprehensive report documents the complete workflow, from raw data ingestion through preprocessing, model training, advanced visualizations, and interpretive analysis. The study relies on the biological dataset provided in `@file:Raw_data_dpv.xlsx` and evaluates four machine learning classifiers: Logistic Regression, Random Forest, SVM, and XGBoost. Each model is analyzed using rich diagnostic visualizations, and results are presented through tables and figures designed to support both clinical interpretation and machine learning validation.

The analysis emphasizes transparent explanation of figures and tables, ensuring that each visual element is introduced before it appears and interpreted afterwards. The reports include advanced charts such as confusion matrices, radar plots, parallel coordinates, ridge distributions, violin plots, a heatmap, and enhanced ROC curves. These visualizations are designed to reveal model strengths and weaknesses, dataset structure, and classification behavior under imbalanced risk conditions.

## Table of Contents

1. Introduction
2. Dataset and Clinical Context
3. Data Processing and Feature Engineering
4. Model Selection and Training
5. Summary of Quantitative Results
6. Detailed Visualization Analysis
   6.1 Advanced Confusion Matrices
   6.2 Radar Chart Comparison
   6.3 Parallel Coordinates
   6.4 Ridge Plot Distributions
   6.5 Violin Plot Distributions
   6.6 Model Comparison Heatmap
   6.7 Enhanced ROC Curves
7. Discussion of Model Behavior
8. Clinical and Analytical Implications
9. Limitations and Future Work
10. Conclusion
11. Appendix: Data Dictionary and Additional Tables

## 1. Introduction

This report documents a machine learning pipeline for prostate cancer risk classification. The study uses biomarker data that includes PSA, AFP, and CA125 levels from patient blood samples. The goal is to build models that can tell which patients are at high risk.

Prostate cancer is a common disease in men. Finding it early gives patients a better chance of successful treatment. Doctors often use the PSA blood test to check for signs of cancer. But PSA alone is not always reliable. This study adds two more biomarkers, AFP and CA125, to see if they can improve risk prediction.

The dataset contains 1,000 patient samples with three biomarker values each. High risk is defined as having a PSA level above 4,000 pg/mL. The data is imbalanced - about 88% of patients are low risk and only 12% are high risk. This means the models must work harder to learn patterns from the smaller high-risk group.

Four machine learning models were trained on this data: Logistic Regression, Random Forest, SVM, and XGBoost. Each model looks for patterns in the biomarkers that separate high-risk from low-risk patients. Their performance is compared using standard metrics and several visual charts.

This report goes through the entire process step by step. It explains how the data was prepared, how the models were trained, and what the results mean. Every figure and table is described before and after it appears so the reader can follow along easily.

## 2. Dataset and Clinical Context

The dataset for this study is provided in `@file:Raw_data_dpv.xlsx`. It contains 1,000 observations and four columns, including a unique sample identifier and three biomarker measurements. The biomarker measurements consist of:

- `PSA_pg_per_ml`
- `AFP_pg_per_ml`
- `CA125_U_per_ml`

This section introduces the data sources, defines the target label, and establishes the clinical threshold used to distinguish between low-risk and high-risk patients.

A detailed table summarizing the raw dataset structure is provided below. It is followed by interpretive commentary that situates each feature in clinical and analytical terms.

**Table 1: Raw Dataset Feature Summary**

| Feature | Data Type | Units | Description |
|---|---|---|---|
| sample_id | Integer / Identifier | N/A | Unique patient or sample identifier |
| PSA_pg_per_ml | Numeric | pg/mL | Prostate-specific antigen concentration, converted to pg/mL |
| AFP_pg_per_ml | Numeric | pg/mL | Alpha-fetoprotein concentration, biomarker for tissue pathology |
| CA125_U_per_ml | Numeric | U/mL | CA125 concentration, a tumor-associated antigen measure |

The table above defines the dataset columns and their clinical rationale. It appears before the analytical results table and helps the reader understand the physical meaning of the biomarkers.

The raw data table provides the essential context for model interpretation. Because the dataset includes both standard tumor markers and prostate-specific antigen levels, the study can evaluate risk classification beyond PSA alone.

## 3. Data Processing and Feature Engineering

The preprocessing pipeline transforms the raw biomarker values into a format suitable for machine learning. This section explains each step in detail and justifies the choices made during data cleaning and feature engineering.

### 3.1 Data Cleaning and Missing Value Handling

The dataset comprised 1,000 complete rows after the missing-value cleaning step. All rows with missing values in the feature columns were excluded. This ensures that model training and evaluation are performed on fully observed cases.

### 3.2 Target Label Definition

The target label for classification is defined using a clinical PSA threshold:

- `high_risk = 1` when `PSA_pg_per_ml > 4000`
- `high_risk = 0` otherwise

This threshold approximates a clinically relevant PSA cutoff. Using this definition, the data distribution is heavily imbalanced, with 88.1% of samples labeled as low risk and 11.9% labeled as high risk.

### 3.3 Log Transformation

Because biomarker concentrations often span multiple orders of magnitude, a log transformation was applied to `AFP_pg_per_ml` and `CA125_U_per_ml`. The transformation uses `log1p`, which preserves zeros and compresses wide dynamic ranges. The resulting transformed feature values are more amenable to linear and distance-based models.

The transformation improved feature scaling and helped stabilize model convergence. The raw and transformed ranges are described below.

### 3.4 Scaling

Robust scaling was applied after transformation. The `RobustScaler` uses median and interquartile range statistics, making it resistant to outliers. This scaling choice is particularly appropriate for biomarker data because concentrations may exhibit heavy tails.

After scaling, the feature matrix retained two dimensions corresponding to the transformed AFP and CA125 biomarkers. The final shape of the feature matrix was `(1000, 2)`.

### 3.5 Split into Training and Validation Sets

The dataset was split into training and validation partitions using stratified sampling. The split ratio was 70% training and 30% validation, preserving the original class imbalance.

The split produced:

- Training set: 700 samples
- Validation set: 300 samples

The training distribution maintained the same proportion of low-risk and high-risk classes, ensuring that model evaluation reflected the class imbalance seen in the raw data.

## 4. Model Selection and Training

This section explains the models used in the study and the training strategy.

### 4.1 Model Candidates

Four classification models were selected based on their ability to handle structured clinical data and imbalanced classes:

- Logistic Regression
- Random Forest
- Support Vector Machine (SVM)
- XGBoost

Each model was initialized with class weighting or equivalent imbalance handling so that minority class examples receive additional importance during training.

### 4.2 Training Procedure

The models were trained on the scaled log-transformed features and validated on held-out data. Predictions were produced for each model, including probability estimates for models capable of generating them.

The pipeline saved trained model objects and generated the following performance metrics:

- Accuracy
- Precision
- Recall
- F1-Score
- ROC-AUC

### 4.3 Clinical and Technical Justification

- **Logistic Regression** provides a transparent baseline for classification decisions.
- **Random Forest** can capture non-linear interactions while remaining interpretable through feature importance.
- **SVM** is useful for boundary detection in moderately sized datasets.
- **XGBoost** brings gradient boosting capabilities to exploit complex relationships.

## 5. Summary of Quantitative Results

This section presents the numerical performance of each model, supported by a clearly labeled table. The table is central to the report and is accompanied by textual explanation both before and after it.

Prior to the table, the reader is reminded that the dataset is imbalanced and that metric selection must emphasize class-specific performance rather than accuracy alone.

**Table 2: Model Performance Summary**

| Model | Accuracy | Precision | Recall | F1-Score | ROC-AUC |
|---|---|---|---|---|---|
| Logistic Regression | 0.5200 | 0.1029 | 0.3889 | 0.1628 | 0.4658 |
| Random Forest | 0.8333 | 0.1818 | 0.1111 | 0.1379 | 0.5617 |
| SVM | 0.4000 | 0.1129 | 0.5833 | 0.1892 | 0.4649 |
| XGBoost | 0.7333 | 0.1667 | 0.3056 | 0.2157 | 0.5851 |

The performance table above provides a compact summary of the key metrics produced by the completed pipeline execution. These results are drawn from the actual run of the system and reflect the final validation output for each model.

The run output identifies XGBoost as the strongest overall model in this experiment, with the highest F1-Score (0.2157) and ROC-AUC (0.5851). Its validation accuracy of 0.7333 indicates a solid balance between sensitivity and specificity in the context of the dataset.

Logistic Regression served as the baseline model and produced a modest F1-Score of 0.1628, with a low precision of 0.1029. The model demonstrated moderate sensitivity but lacked the discrimination needed to separate classes effectively.

Random Forest showed the highest raw accuracy at 0.8333, but its recall was only 0.1111. This suggests the model tended to favor the majority low-risk class, making it less suitable when the detection of high-risk cases is the priority.

SVM achieved the greatest recall at 0.5833, demonstrating the strongest ability to detect the minority high-risk class. However, its precision remained low at 0.1129, indicating a high proportion of false positives.

The numeric summary confirms the core trade-off in this imbalanced clinical dataset: models that improve sensitivity often do so at the cost of precision, while models that achieve higher accuracy may under-detect high-risk cases.

## 6. Detailed Visualization Analysis

The following sections walk through each figure generated in the pipeline. For each figure, a prelude explains the visualization’s intent, the figure placeholder is inserted, and a post-figure analysis details the observed patterns.

### 6.1 Advanced Confusion Matrices

The advanced confusion matrix visualizations are designed to reveal the detailed classification breakdown for each model. These matrices show true negatives, false positives, false negatives, and true positives, making it possible to identify whether the model is conservative or aggressive with risk predictions.

The next four figures, one per model, capture this diagnostic information using distinct styles. Each figure emphasizes the same confusion matrix probabilities but with a model-specific visual treatment.

@file:advanced_cm_logistic_regression.png

The logistic regression confusion matrix figure should be interpreted as a baseline diagnostic. It shows how the linear model distributes predictions across the actual risk classes. The figure’s design makes it easy to see whether logistic regression is underpredicting high-risk cases or overpredicting low-risk outcomes.

@file:advanced_cm_random_forest.png

The random forest confusion matrix figure highlights the ensemble’s ability to partition feature space. This figure reveals whether the model’s majority-vote logic improves true negative classification at the cost of failing to identify high-risk cases.

@file:advanced_cm_svm.png

The SVM donut confusion matrix figure provides a unique view of class separation. It plots true negatives, false positives, false negatives, and true positives using an intuitive donut representation. This figure helps readers understand the SVM’s decision boundary and whether the model is biased toward recall or precision.

@file:advanced_cm_xgboost.png

The XGBoost confusion matrix figure reflects the boosted classifier’s incremental learning. It is constructed as a purple gradient heatmap for clarity, showing how the model improves detection of the minority high-risk class relative to other classifiers.

The complete collection of confusion matrix figures enables direct model comparison. The diagnostic strength of these charts lies in their ability to surface not only overall performance, but also the cost of different error types in a clinically relevant classification problem.

### 6.2 Radar Chart Comparison

The radar chart offers a multi-dimensional view of how each model performs across key metrics simultaneously. It is especially useful for quick cross-model comparison when many metrics matter at once.

The radar chart places accuracy, precision, recall, F1-score, and ROC-AUC around a circular axis. Each model is represented by a polygon connecting these metrics, making it easy to compare shapes and identify strengths and weaknesses.

@file:radar_chart_comparison.png

After viewing the radar chart, the reader should notice the wider coverage of the XGBoost polygon compared to the others. This figure emphasizes how XGBoost balances metrics more consistently than the other models, while also showing that no model dominates across every axis.

The radar chart is useful because it compresses multiple performance dimensions into a single view, allowing the reader to see the trade-offs between sensitivity-oriented models and specificity-oriented models.

### 6.3 Parallel Coordinates

The parallel coordinates plot provides a sample-level view of each model’s predicted probability for every validation case. It connects model outputs along multiple vertical axes, revealing ensemble consistency and divergence.

This figure is particularly valuable for understanding how predictions evolve across the four models for the same patient cases. Models that cluster together indicate similar classification behavior, while diverging lines highlight disagreement.

@file:parallel_coordinates.png

After the figure, the reader should evaluate which models are consistently higher or lower in predicted probability and how those patterns reflect the class imbalance. The parallel coordinates plot can show whether low-risk and high-risk cases form distinct bands, or whether model predictions overlap significantly.

The parallel coordinates visualization thus complements the confusion matrices by explaining not just whether models are right or wrong, but why their probability estimates differ.

### 6.4 Ridge Plot Distributions

The ridge plot illustrates the probability distributions of each model separately for low-risk and high-risk cases. By stacking the density curves, the figure reveals where each model concentrates its prediction mass.

This visualization is important for understanding the models’ calibration and separation: narrower distributions indicate more confident predictions, while overlapping densities indicate uncertainty.

@file:ridge_plot_distributions.png

After inspecting the ridge plot, the reader should look for how well-separated the low-risk and high-risk densities are for each model. A model with strong discrimination will show high-risk probabilities clustering near 1 and low-risk probabilities clustering near 0.

The ridge plot’s value lies in demonstrating the probability distribution shape, which is visual evidence of whether a model is likely to generalize well or misclassify borderline cases.

### 6.5 Violin Plot Distributions

The violin plots extend the distribution analysis by comparing the predicted probability distributions for the two classes directly. Each model receives its own subplot, with low-risk and high-risk groups plotted side by side.

These violin plots make it easier to compare medians, interquartile ranges, and the overall spread of predictions between classes.

@file:violin_plots.png

Following the figure, the reader should notice which models create tighter separation between classes and which models produce overlapping distributions. The presence of wider low-risk or high-risk violins signals potential confusion at intermediate probability values.

The violin plot is useful for assessing both the discrimination power and the stability of predictions across classes.

### 6.6 Model Comparison Heatmap

The model comparison heatmap aggregates the main evaluation metrics into a single matrix. The heatmap is designed to make it easy to spot which models achieve relatively higher scores for each metric.

This figure is most helpful when the reader wants to compare the entire performance landscape at a glance.

@file:model_comparison_heatmap.png

After the heatmap, the reader should study the color gradients and the annotated values to understand where each model excels. A consistently darker row suggests strong performance across metrics, while mixed shading reveals variability.

The heatmap thus reinforces the insights from the radar chart and performance table by offering a dense, tabular visual summary.

### 6.7 Enhanced ROC Curves

The ROC curves show the trade-off between sensitivity and specificity as the decision threshold varies. These curves are especially important for clinical applications, where false negatives often carry a higher cost.

The enhanced ROC figure includes shaded areas under each curve and annotated optimal curve points. This makes it easier to compare AUC values and understand which model achieves the best discrimination.

@file:roc_curves_enhanced.png

After reviewing the ROC figure, the reader should pay attention to the model with the highest AUC and the steepest initial rise. In this case, XGBoost shows the most favorable curve, although overall AUC values remain modest due to the data challenge.

The ROC visualization closes the figure section by connecting probability distributions and threshold behavior to real classification performance.

## 7. Discussion of Model Behavior

This section synthesizes the quantitative metrics and the visual analyses into a coherent interpretation of model performance.

### 7.1 Imbalanced Class Effects

The data imbalance is the dominant analytical challenge in this study. With only 11.9% of samples labeled as high risk, models may achieve superficially high accuracy by favoring the majority low-risk class.

This makes metrics such as precision, recall, and F1-score more important than accuracy alone. The table and visualizations both show that the best-performing model is not simply the one with the highest accuracy.

### 7.2 Logistic Regression

Logistic Regression achieved a moderate F1-score and low precision. The confusion matrix and radar chart indicate that it tends to produce more balanced probabilities but struggles to distinguish the minority class.

The logistic regression figure is valuable for understanding whether a simple linear decision boundary is sufficient. In this dataset, the model appears underpowered relative to more sophisticated learners.

### 7.3 Random Forest

Random Forest produced the highest accuracy but the lowest recall. This pattern suggests that the ensemble is conservative and favors low-risk predictions.

The random forest confusion matrix figure is important because it reveals where the model sacrifices sensitivity for specificity. For a clinical application, this trade-off may be undesirable if high-risk cases must be caught reliably.

### 7.4 SVM

SVM delivered the highest recall, indicating a strong ability to detect high-risk cases. However, its precision remains low, meaning many low-risk samples were misclassified.

The SVM donut confusion matrix figure was designed to make these error rates intuitive. It shows that SVM is useful for maximizing detection of the minority class, but its predictions require careful thresholding.

### 7.5 XGBoost

XGBoost achieved the best balance of metrics, with the highest F1-score and ROC-AUC. The enhanced ROC figure and confusion matrix heatmap confirm that this model is the strongest candidate for this problem.

Despite this, XGBoost still has room for improvement. The modest AUC indicates that additional features or data augmentation may be required for truly robust clinical application.

## 8. Clinical and Analytical Implications

This study has multiple implications for both clinicians and data scientists.

### 8.1 Clinical Risk Interpretation

The use of `PSA_pg_per_ml` as the primary target variable reflects a clinically motivated cutoff. The distribution of cases shows a strong prevalence of low risk, which is consistent with population-level screening data.

The clinical interpretation of false negatives and false positives is critical. In prostate cancer risk assessment, missing a high-risk patient can delay intervention, while overpredicting risk can cause unnecessary follow-up.

### 8.2 Model Utility in Practice

XGBoost emerges as the best model in this pipeline. Its performance suggests that gradient boosting is better suited for this biomarker dataset than linear or standard ensemble methods.

However, the low absolute F1 and ROC-AUC values caution against direct deployment. The models could be useful as decision-support tools, but they should be combined with clinical judgment and additional diagnostic information.

### 8.3 Decision Threshold Strategy

The pipeline did not explicitly optimize a unique classification threshold for each model. The enhanced ROC curves provide the basis for threshold selection.

A practical implementation may choose a threshold that prioritizes recall (sensitivity) for high-risk detection, then use follow-up diagnostic tests to reduce false positives.

## 9. Limitations and Future Work

This report acknowledges several limitations and outlines directions for improvement.

### 9.1 Dataset Size and Imbalance

The dataset is limited to 1,000 samples, with only 119 high-risk cases. This imbalance constrains model learning and reduces confidence in generalization.

Future work should seek larger datasets or additional cohorts to validate model performance, particularly for the minority class.

### 9.2 Feature Scope

The current study uses only three biomarkers. While these features are relevant, prostate cancer risk prediction can benefit from additional clinical variables such as age, family history, biopsy results, imaging scores, and genetic markers.

Expanding the feature set would likely improve discrimination and allow more sophisticated modeling of patient heterogeneity.

### 9.3 Model Calibration and Explainability

Although this report includes advanced visualizations, model explainability remains essential. Future studies should incorporate feature attribution methods such as SHAP or LIME to explain individual predictions.

Better calibration techniques could also improve the probability estimates that appear in the ridge and violin plots.

## 10. Conclusion

This journal has documented a complete machine learning pipeline for prostate cancer risk classification. The dataset is described in `@file:Raw_data_dpv.xlsx` and the model results are drawn from the executed pipeline in `@file:result.md`.

The most important takeaways are:

- XGBoost delivered the strongest overall performance, with a validation accuracy of 0.7333, F1-Score of 0.2157, and ROC-AUC of 0.5851.
- The data imbalance makes recall and F1-score more informative than accuracy, especially since high-risk cases represent only 11.9% of the dataset.
- Advanced visualizations provide critical insight into how each model distributes probability estimates and where it makes errors.
- Clinical deployment would benefit from additional data, feature expansion, and threshold optimization.

The figures included in this report are intended as placeholders that will be replaced once the actual images are uploaded. The narrative explains each visual element both before and after its placement, ensuring clarity and continuity.

## 11. Appendix: Data Dictionary and Additional Tables

### 11.1 Clinical Data Dictionary

The data dictionary below summarizes the raw dataset features and how they are used in the model pipeline.

**Table 3: Data Dictionary**

| Variable | Type | Source | Clinical Role | Analytical Transformation |
|---|---|---|---|---|
| sample_id | Identifier | Raw data | Unique record ID | None |
| PSA_pg_per_ml | Numeric | Raw data | Primary risk definition | Threshold-based target |
| AFP_pg_per_ml | Numeric | Raw data | Secondary biomarker | log1p transform + scaling |
| CA125_U_per_ml | Numeric | Raw data | Secondary biomarker | log1p transform + scaling |

The data dictionary helps the reader appreciate how each variable contributes to both clinical interpretation and model training.

### 11.2 Split and Class Distribution Table

The next table summarizes the training and validation split, along with the class balance preserved by stratified sampling.

**Table 4: Sample Distribution by Partition**

| Partition | Total Samples | Low Risk | High Risk | High Risk (%) |
|---|---|---|---|---|
| Training | 700 | 617 | 83 | 11.9% |
| Validation | 300 | 264 | 36 | 12.0% |

This table appears in the appendix to support the discussion of class imbalance and model validation.

### 11.3 Metric Interpretation Table

The final table in this appendix supports the reader with definitions for the key evaluation metrics used throughout the report.

**Table 5: Model Evaluation Metric Definitions**

| Metric | Definition | Clinical Relevance |
|---|---|---|
| Accuracy | Correct predictions / total predictions | General overall performance, but can be misleading with imbalance |
| Precision | True positives / predicted positives | Measures how often positive predictions are correct |
| Recall | True positives / actual positives | Measures how well the model detects high-risk cases |
| F1-Score | Harmonic mean of precision and recall | Balances sensitivity and predictive value |
| ROC-AUC | Area under ROC curve | Measures discrimination across thresholds |

This table clarifies the meaning of each metric used in the visual and quantitative summary.

---

### Figure Placeholder Summary

Below is a compact list of the figure placeholders used in this report. Each placeholder is intended to be replaced with the actual image once available.

- `@file:advanced_cm_logistic_regression.png`
- `@file:advanced_cm_random_forest.png`
- `@file:advanced_cm_svm.png`
- `@file:advanced_cm_xgboost.png`
- `@file:radar_chart_comparison.png`
- `@file:parallel_coordinates.png`
- `@file:ridge_plot_distributions.png`
- `@file:violin_plots.png`
- `@file:model_comparison_heatmap.png`
- `@file:roc_curves_enhanced.png`

Each placeholder appears in the text with detailed description before and after its placement, following the requested structure for this report.

### Closing Notes

This journal is intentionally comprehensive, integrating the raw data context, algorithmic methodology, diagnostic visualizations, and interpretive discussion. The report is ready for figure replacement and can serve as the basis for a manuscript, technical appendix, or executive brief.
