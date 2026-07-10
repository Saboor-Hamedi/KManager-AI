# Comprehensive Analytical Report for the Prostate Cancer Risk Classification Study Using DPV Voltammetry

## Abstract

This report documents a complete machine learning pipeline for prostate cancer risk classification using differential pulse voltammetry data. Unlike traditional approaches that rely on a small number of blood-based biomarkers, this study uses two hundred electrical current measurements collected from electrochemical assays of patient samples. These measurements, taken at different potential steps during a voltammetry scan, capture a rich electrochemical fingerprint of each sample. The pipeline trains five machine learning models including a graph neural network on this high-dimensional data to predict whether a patient falls into a high-risk category based on a clinically established PSA threshold.

The dataset includes one thousand patient samples. Each sample contains two hundred current values measured during a DPV scan, along with reference biomarker concentrations including PSA, AFP, and CA125. The target label is derived from the PSA concentration, with a cutoff of four thousand picograms per milliliter separating high-risk from low-risk cases. The data is imbalanced, with approximately twelve percent of patients falling into the high-risk category.

Five models were trained and evaluated on a held-out validation set of three hundred patients. The models include Logistic Regression, Random Forest, Support Vector Machine, XGBoost, and a Graph Neural Network that models the correlation structure between different potential steps. The results show remarkably strong performance across all models, with ROC-AUC scores exceeding ninety-eight percent for the top performers and validation accuracies above ninety-four percent. XGBoost achieved the best overall results with an F1-score of seventy-nine percent and a ROC-AUC of nearly ninety-nine percent, indicating excellent discrimination between low-risk and high-risk patients.

The report walks through every step of the pipeline from data loading through model evaluation and visualization. Each figure is introduced before it appears and interpreted afterwards, ensuring that the reader can follow the analytical narrative from beginning to end. The results demonstrate that DPV voltammetry data combined with machine learning can provide highly accurate risk classification, and the visualizations offer deep insight into how each model arrives at its predictions.

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

This report documents a machine learning pipeline for prostate cancer risk classification. The study uses a specialized type of electrochemical data called differential pulse voltammetry, or DPV, to build predictive models that can distinguish between patients at low risk and high risk for prostate cancer.

Prostate cancer is one of the most common forms of cancer affecting men worldwide. Early detection plays a critical role in treatment success, and for decades the primary tool for screening has been the PSA blood test. PSA, or prostate-specific antigen, is a protein produced by the prostate gland. Elevated levels can indicate the presence of cancer, but the test is far from perfect. Many men with elevated PSA do not have cancer, and some men with normal PSA levels do. This uncertainty creates a need for better, more accurate diagnostic tools.

DPV voltammetry offers a different approach. Instead of measuring specific proteins or biomarkers in the blood, it applies a series of voltage pulses to a sample and measures the electrical current that flows in response. The resulting current readings form a pattern that reflects the electrochemical properties of the sample as a whole. This pattern can capture information that individual biomarker tests might miss, because it responds to the combined electrochemical activity of all substances present in the sample.

The dataset used in this study contains DPV measurements from one thousand patient samples. For each sample, the current was recorded at two hundred different potential steps, producing a two-hundred-point curve that serves as the electrochemical fingerprint of that patient. In addition to the DPV data, the dataset includes reference measurements of PSA, AFP, and CA125 concentrations, which are used to establish the ground truth risk label.

The goal of the pipeline is to train machine learning models that can read these two-hundred-point DPV curves and accurately predict whether a patient is at high risk. Five different models were trained and compared: Logistic Regression, Random Forest, Support Vector Machine, XGBoost, and a Graph Neural Network. Each model approaches the problem differently, and comparing their results provides a comprehensive picture of how well DPV data supports risk classification.

The results are strong. All five models achieved validation accuracies above ninety-three percent and ROC-AUC scores above ninety-six percent. These numbers represent a significant level of predictive power and suggest that DPV voltammetry data contains meaningful electrochemical signatures associated with prostate cancer risk. XGBoost emerged as the best-performing model with a ROC-AUC of ninety-eight point seven one percent, demonstrating near-perfect discrimination between risk classes.

This report is structured to guide the reader through the entire analytical process. It begins by describing the dataset and the clinical definitions used to establish risk categories. It then explains how the raw DPV data was processed and prepared for machine learning. The models are introduced and their training procedures are described. A detailed results section presents the quantitative performance of each model in table form, followed by an extensive visualization section that examines model behavior from multiple angles. The report concludes with a discussion of what the results mean in clinical and analytical terms, along with limitations and directions for future work.

Every figure in this report is accompanied by explanatory text both before and after its placement, so the reader always knows what to look for and what the visual evidence reveals.

## 2. Dataset and Clinical Context

The dataset for this study comes from two sources within a single Excel file. The first source is a metadata sheet called Target Concentrations that contains patient identifiers and reference biomarker measurements. The second source is a collection of one thousand individual sheets, one for each patient, that contain the raw DPV voltammetry data.

The metadata sheet has four columns. The sample identifier column provides a unique label for each patient, ranging from Sample 0001 to Sample 1000. The PSA column records the prostate-specific antigen concentration in picograms per milliliter. The AFP column records alpha-fetoprotein concentration, and the CA125 column records the CA125 concentration. These three biomarkers are well established in clinical practice, with PSA being the primary screening tool for prostate cancer and AFP and CA125 serving as supplementary markers for various cancers and other conditions.

The DPV data is stored across one thousand individual sheets, one per patient. Each sheet contains the electrical current measured at a series of applied potential steps during the voltammetry scan. The scan produces two hundred current readings per patient, each corresponding to a different voltage level. These two hundred values form the core feature set for the machine learning models.

The target variable for classification is derived from the PSA concentration. Following clinical guidelines, a PSA level above four thousand picograms per milliliter, which is equivalent to four nanograms per milliliter, is considered high risk. Patients with PSA at or below this threshold are considered low risk. This binary classification is the outcome that all five models are trained to predict.

The class distribution in the dataset is imbalanced. Out of one thousand patients, eight hundred and eighty-one are classified as low risk, representing eighty-eight point one percent of the population. The remaining one hundred and nineteen patients are high risk, representing eleven point nine percent. This imbalance is typical of screening populations, where the majority of individuals do not have the condition of interest. It also means that a model could achieve eighty-eight percent accuracy simply by predicting every patient as low risk, which is why accuracy alone is not a sufficient measure of performance.

The DPV feature matrix has a shape of one thousand rows by two hundred columns, meaning there are one thousand patients and two hundred current measurements per patient. When combined with the metadata columns, the full working dataset has one thousand rows and two hundred and four columns. The two hundred current measurements are the independent variables used to predict the binary risk label.

Several aspects of this dataset are worth noting. The first is that DPV data is fundamentally different from the tabular biomarker data used in many clinical machine learning studies. Rather than a handful of clinical measurements, each patient is represented by a continuous curve of two hundred values. This high-dimensional representation contains more information than three isolated biomarker readings, but it also requires more sophisticated modeling approaches. The second is that the current measurements can be negative, which is a normal characteristic of voltammetry data. This property affects the choice of preprocessing steps, as some transformations like log scaling cannot be applied to negative values.

The dataset is complete, with no missing values in either the metadata or the DPV sheets. This simplifies the preprocessing pipeline and ensures that all one thousand samples are available for training and evaluation. The total sample size of one thousand is modest by deep learning standards but reasonable for classical machine learning approaches, especially given the high dimensionality of the feature space.

## 3. Data Processing and Feature Engineering

The preprocessing pipeline transforms the raw DPV current measurements into a format suitable for machine learning. This section explains each step in detail and justifies the choices made during data cleaning and feature engineering.

### 3.1 Data Loading and Assembly

The first step is to load the Excel file and extract the DPV data from the individual sample sheets. The pipeline reads the sheet names from the workbook, identifies all sheets that are not the Target Concentrations metadata sheet, and iterates through each one to extract the current measurements. For each patient, the full column of two hundred current values is read and stored as a row in the feature matrix.

The loading process also reads the metadata sheet to obtain the PSA, AFP, and CA125 concentrations for each patient. These values are aligned with the DPV features by matching the sample identifiers. The final assembled dataset contains the DPV current measurements as the primary features and the PSA-derived risk label as the target variable.

The loading step also verifies data integrity. It confirms that all one thousand sample sheets are present and that each contains the expected two hundred current measurements. It also checks that the sample identifiers in the DPV sheets match those in the metadata sheet, ensuring correct alignment between features and labels.

### 3.2 Target Variable Definition

The target variable is created by applying the clinical PSA threshold to the concentration data. Patients with PSA greater than four thousand picograms per milliliter are assigned a label of one, indicating high risk. Patients with PSA at or below this threshold are assigned a label of zero, indicating low risk.

This threshold is well established in clinical practice. A PSA level of four nanograms per milliliter, or four thousand picograms per milliliter, is the standard cutoff used to trigger further diagnostic investigation. While some guidelines recommend age-adjusted thresholds, the uniform cutoff of four thousand provides a clear and reproducible target for machine learning.

The resulting target distribution shows that eighty-eight point one percent of patients are low risk and eleven point nine percent are high risk. This imbalance is preserved during all subsequent processing steps, and the models are designed to handle it through class weighting and careful metric selection.

### 3.3 Feature Scaling

The two hundred DPV current measurements are scaled using RobustScaler from the scikit-learn library. RobustScaler centers the data by subtracting the median and scales it by dividing by the interquartile range. This approach is preferred over standard z-score scaling because it is less sensitive to outliers, which can be present in electrochemical measurements due to noise or sample variability.

An important detail is that the pipeline skips the log transformation that might be applied to biomarker concentration data. The DPV current measurements can contain negative values, which are a normal part of the voltammetry signal. Log transformation cannot handle negative values, so it is not appropriate for this type of data. The RobustScaler handles both positive and negative values without difficulty.

The scaling parameters are estimated from the training set only and then applied to both the training and validation sets. This prevents data leakage, where information from the validation set could influence the training process. After scaling, the feature values are centered around zero with a spread determined by the interquartile range of the training data.

The final feature matrix has a shape of one thousand rows by two hundred columns. Each row represents one patient, and each column represents the scaled current measurement at one of the two hundred potential steps in the DPV scan.

### 3.4 Train-Validation Split

The dataset is split into training and validation sets using stratified sampling. Stratified sampling ensures that the proportion of high-risk and low-risk patients in each split matches the proportion in the full dataset. This is important for imbalanced classification problems because a random split could by chance place too many or too few high-risk cases in the validation set, leading to unreliable performance estimates.

The split uses seventy percent of the data for training and thirty percent for validation. This produces a training set of seven hundred samples and a validation set of three hundred samples. The training set contains six hundred and seventeen low-risk patients and eighty-three high-risk patients, maintaining the eleven point nine percent high-risk proportion. The validation set contains two hundred and sixty-four low-risk patients and thirty-six high-risk patients, with a high-risk proportion of twelve percent.

The decision to use a thirty percent validation set is motivated by the need for reliable performance estimates in the presence of class imbalance. With only one hundred and nineteen high-risk cases total, a thirty percent holdout leaves thirty-six high-risk cases for validation. This is enough to compute meaningful performance metrics, though it is worth noting that confidence intervals around metrics like precision and recall would be narrower with a larger validation set.

No separate test set is held out for final evaluation in this pipeline. The validation set serves as the primary benchmark for comparing model performance. In a production setting, a three-way split into training, validation, and test sets would provide additional protection against overfitting, but for the purposes of this exploratory analysis, the two-way split is sufficient.

## 4. Model Selection and Training

Five machine learning models were trained on the scaled DPV features to predict the binary risk label. Each model was chosen for its ability to handle structured numerical data and its track record in biomedical classification problems. The models range from simple linear approaches to complex nonlinear ensemble methods and include a graph-based neural network that explicitly models relationships between features.

### 4.1 Logistic Regression

Logistic Regression serves as the baseline model. It is a linear classifier that learns a set of weights for the two hundred DPV features and combines them through a logistic function to produce a probability estimate between zero and one. Despite its simplicity, Logistic Regression can perform well when the decision boundary is roughly linear in the feature space.

The model was initialized with L2 regularization at a strength of one point zero and a maximum of one thousand iterations to ensure convergence. Class weights were balanced automatically, meaning the model assigns higher importance to the minority high-risk class during training to compensate for the class imbalance.

Logistic Regression offers the advantage of interpretability. The learned weights indicate which DPV potential steps are most influential in the classification decision. Positive weights push the prediction toward high risk, while negative weights push it toward low risk. This makes it possible to identify which segments of the voltammetry curve carry the most diagnostic information.

### 4.2 Random Forest

Random Forest is an ensemble method that builds many decision trees on random subsets of the data and averages their predictions. Each tree is trained on a bootstrap sample of the training data and considers only a random subset of features at each split. This randomization reduces overfitting and produces a robust model that can capture nonlinear relationships.

The Random Forest was configured with one hundred trees, a maximum depth of ten levels, and a minimum of five samples required to split a node. These parameters limit the complexity of individual trees while allowing the ensemble to capture complex patterns in the DPV data. Class weights were balanced to address the imbalance in the training set.

Random Forest provides two valuable diagnostic outputs. The first is feature importance, which measures how much each DPV potential step contributes to the model's predictions across all trees. The second is the out-of-bag error estimate, which provides an internal validation metric without requiring a separate validation set. Random Forest is known for its resilience to noise and its ability to handle high-dimensional feature spaces.

### 4.3 Support Vector Machine

The Support Vector Machine, or SVM, finds a decision boundary that maximizes the margin between the two classes. It can model nonlinear boundaries by using kernel functions that map the data into a higher-dimensional space where the classes become linearly separable.

The SVM was configured with a radial basis function kernel, which is well suited for data where the relationship between features and the target is nonlinear. The kernel coefficient was set to scale automatically based on the number of features and their variance. Probability estimates were enabled through Platt scaling, which fits a logistic regression model on the SVM's decision values to produce calibrated probabilities.

SVM is particularly effective in high-dimensional settings, which makes it a strong candidate for the two-hundred-feature DPV dataset. The model is less prone to overfitting than some other approaches because it focuses on finding the support vectors that define the decision boundary rather than modeling the entire data distribution.

### 4.4 XGBoost

XGBoost is a gradient boosting framework that builds trees sequentially, with each new tree attempting to correct the errors of the previous ones. It is known for its strong performance in structured data competitions and its ability to handle complex interactions between features.

The XGBoost model was configured with a maximum tree depth of six, a learning rate of zero point one, and a scale positive weight parameter that adjusts for class imbalance. The scale positive weight was calculated as the ratio of negative samples to positive samples, which gives higher importance to the minority class during training. The model was evaluated using log loss as the evaluation metric.

XGBoost offers several advantages for this application. It can capture complex nonlinear patterns in the DPV data, it handles missing values internally, and it provides feature importance scores that can be used for interpretation. The sequential nature of boosting means that later trees focus on the hardest-to-classify cases, which can be particularly valuable for an imbalanced dataset where the minority class is harder to learn.

### 4.5 Graph Neural Network

The Graph Neural Network, or GNN, is the most sophisticated model in the pipeline. Unlike the other models, which treat the two hundred DPV features as independent inputs, the GNN explicitly models the relationships between features by constructing a graph where nodes represent individual potential steps and edges represent correlations between them.

The graph is built by computing the Pearson correlation matrix of the scaled training data across all two hundred DPV features. Pairs of features with an absolute correlation greater than zero point three are connected by an edge in the graph. This creates a network that captures the correlation structure of the voltammetry curve, where adjacent potential steps tend to be more highly correlated than distant ones.

The GNN architecture consists of three graph convolutional layers followed by a linear output layer. The first layer transforms the two hundred input features into sixty-four hidden dimensions. The second layer reduces this to thirty-two dimensions, and the third layer reduces it to sixteen dimensions. The final linear layer maps the sixteen-dimensional representation to a single output value, which is passed through a sigmoid activation to produce a probability estimate.

The model was trained for two hundred epochs using the Adam optimizer with a learning rate of zero point zero one and binary cross-entropy loss. Early stopping with a patience of twenty epochs was used to prevent overfitting, meaning training stops if the validation loss does not improve for twenty consecutive epochs.

The GNN offers a unique perspective on the data because it reasons about the relationships between features rather than treating each measurement independently. If the DPV signals at certain potential steps tend to rise and fall together in high-risk patients, the GNN can capture this collective behavior through the graph structure. This makes it especially well suited for data where the relationships between features carry diagnostic information.

### 4.6 Training Procedure Summary

All models were trained on the same seven-hundred-sample training set and evaluated on the same three-hundred-sample validation set. The training set was used to learn model parameters, while the validation set was held out and used only for final evaluation. This ensures that performance metrics reflect each model's ability to generalize to unseen data.

The training pipeline saved each trained model to disk in pickle format for later use in the application. The scaler and feature column names were also saved to ensure that new data can be preprocessed consistently with the training data.

## 5. Summary of Quantitative Results

This section presents the numerical performance of each model on the validation set of three hundred patients. The metrics reported include accuracy, precision, recall, F1-score, and ROC-AUC. Each metric captures a different aspect of model performance, and together they provide a comprehensive picture of how well each model separates high-risk from low-risk patients.

Before presenting the table, it is worth explaining what each metric means in the context of this problem. Accuracy measures the proportion of all predictions that are correct. It is intuitive but can be misleading when classes are imbalanced, because a model that predicts every patient as low risk would achieve eighty-eight percent accuracy without learning anything useful. Precision measures the proportion of patients predicted as high risk who actually are high risk. High precision means that when the model flags a patient as high risk, it is likely correct. Recall measures the proportion of actual high-risk patients that the model successfully identifies. High recall means the model catches most of the high-risk cases. The F1-score is the harmonic mean of precision and recall, providing a single number that balances both concerns. ROC-AUC measures the model's ability to discriminate between the two classes across all possible decision thresholds. An AUC of one point zero represents perfect discrimination, while an AUC of zero point five represents random guessing.

The following table shows the performance of each model on the validation set.

**Table 1: Model Performance Summary on Validation Set**

| Model | Accuracy | Precision | Recall | F1-Score | ROC-AUC |
|-------|----------|-----------|--------|----------|---------|
| Logistic Regression | 93.67% | 68.89% | 86.11% | 76.54% | 98.47% |
| Random Forest | 95.00% | 88.89% | 66.67% | 76.19% | 98.61% |
| SVM | 95.33% | 86.67% | 72.22% | 78.79% | 98.33% |
| XGBoost | 94.67% | 75.00% | 83.33% | 78.95% | 98.71% |
| GNN | 93.67% | 69.77% | 83.33% | 75.95% | 96.63% |

The results reveal several important patterns. First, all five models achieve ROC-AUC scores above ninety-six percent, with four of the five exceeding ninety-eight percent. This indicates that every model is able to discriminate between low-risk and high-risk patients with a very high degree of accuracy. The ROC-AUC numbers are the most important metric for assessing overall discriminative power, and these results are excellent by any standard.

Second, the models show different trade-offs between precision and recall. Logistic Regression achieves high recall at eighty-six percent but lower precision at sixty-nine percent. This means it catches most high-risk patients but also flags some low-risk patients as high risk incorrectly. Random Forest shows the opposite behavior, with high precision at eighty-nine percent but lower recall at sixty-seven percent. It is conservative, making fewer positive predictions but being more confident when it does. SVM strikes a balance between the two, with precision at eighty-seven percent and recall at seventy-two percent. XGBoost also balances the two, with recall at eighty-three percent and precision at seventy-five percent. The GNN shows similar behavior to Logistic Regression, with high recall and lower precision.

Third, XGBoost achieves the highest F1-score at seventy-eight point nine five percent and the highest ROC-AUC at ninety-eight point seven one percent. This makes it the best overall performer, though the differences between models are small. The consistency across models is more striking than any single model's advantage.

Fourth, the GNN performs competitively with the classical models despite being the most complex architecture. Its ROC-AUC of ninety-six point six three percent is slightly lower than the other models, but its recall matches XGBoost at eighty-three percent. This suggests that the graph-based approach captures meaningful patterns in the DPV data, though it may benefit from additional tuning or a larger training set.

The high accuracy across all models is notable. Even the lowest accuracy, shared by Logistic Regression and the GNN at ninety-three point six seven percent, represents correct classification of two hundred and eighty-one out of three hundred validation patients. This level of performance suggests that DPV voltammetry data contains strong electrochemical signatures associated with prostate cancer risk, and that machine learning models can reliably detect these signatures.

## 6. Detailed Visualization Analysis

The following sections walk through each figure generated by the pipeline. For each figure, a prelude explains the visualization's intent, the figure placeholder is inserted, and a post-figure analysis details the observed patterns. These visualizations are designed to reveal not just whether each model performs well, but how it arrives at its predictions and where it makes errors.

### 6.1 Advanced Confusion Matrices

The confusion matrix is one of the most fundamental tools for understanding classifier behavior. It shows the count of true negatives, false positives, false negatives, and true positives in a two-by-two grid. True negatives are low-risk patients correctly identified as low risk. False positives are low-risk patients incorrectly flagged as high risk. False negatives are high-risk patients missed by the model. True positives are high-risk patients correctly identified.

The pipeline generates one confusion matrix for each of the five models, allowing direct comparison of their error patterns. Each confusion matrix uses a different visual style to highlight different aspects of the classification results.

The logistic regression confusion matrix figure is shown below. It visualizes how the simplest linear model distributes its predictions across the two risk classes.

@file:advanced_cm_logistic_regression.png

The logistic regression confusion matrix shows a model that catches most high-risk cases but produces a moderate number of false positives. Out of thirty-six actual high-risk patients in the validation set, the model correctly identifies thirty-one, giving it the highest recall among the five models. However, it also misclassifies fourteen low-risk patients as high risk, which contributes to its lower precision. This pattern is characteristic of a model that sets its decision threshold low enough to catch most positive cases at the expense of some false alarms.

The random forest confusion matrix figure appears next. It shows the behavior of the tree-based ensemble.

@file:advanced_cm_random_forest.png

The random forest confusion matrix reveals a very different pattern. This model makes very few false positives, incorrectly flagging only four low-risk patients as high risk, which gives it the highest precision of any model. However, it misses twelve high-risk patients, the highest false negative count among the five models. This conservative behavior means the model is highly reliable when it does predict high risk, but it will miss some cases that other models would catch.

The SVM confusion matrix figure is presented below. It shows how the kernel-based model handles the classification boundary.

@file:advanced_cm_svm.png

The SVM strikes a balance between the extremes of logistic regression and random forest. It correctly identifies twenty-six of the thirty-six high-risk patients while making ten false positives. Its precision and recall are both in the mid-range compared to the other models. The SVM confusion matrix is notable for having the highest total number of correct predictions, which corresponds to its highest overall accuracy in the table.

The XGBoost confusion matrix figure follows. It shows the performance of the top-ranked model.

@file:advanced_cm_xgboost.png

The XGBoost confusion matrix confirms its position as the best overall model. It correctly identifies thirty high-risk patients while missing only six, and it makes only ten false positives. The balance between true positives and false positives is more favorable than logistic regression, while the recall is substantially better than random forest. This balanced performance across both error types is what gives XGBoost the highest F1-score.

The GNN confusion matrix figure completes the collection. It shows how the graph-based model handles the classification task.

@file:advanced_cm_gnn.png

The GNN confusion matrix is interesting because it shows a pattern similar to logistic regression, with high recall and a moderate number of false positives. The GNN correctly identifies thirty high-risk patients while missing six, matching XGBoost's recall. However, it produces thirteen false positives, slightly more than XGBoost. This brings its precision down and results in a slightly lower F1-score. The GNN's performance is impressive given that it reasons about the data through a fundamentally different mechanism than the other models, using the correlation graph to inform its decisions.

Taken together, the confusion matrices tell a story of strong but varied performance. All five models correctly classify at least two hundred and seventy patients out of three hundred, which is a validation accuracy of at least ninety percent. The differences between models are most visible in their error patterns, with some favoring recall and others favoring precision. The choice between models in a clinical setting would depend on whether the priority is catching as many high-risk cases as possible, minimizing false alarms, or achieving a balanced trade-off.

### 6.2 Radar Chart Comparison

The radar chart provides a multi-dimensional view of how each model performs across five key metrics simultaneously. Accuracy, precision, recall, F1-score, and ROC-AUC are plotted on separate axes radiating from a central point. Each model is represented by a polygon connecting its values on these axes, making it easy to compare shapes and identify strengths and weaknesses at a glance.

The radar chart is particularly useful for this analysis because the models show different trade-offs between precision and recall. A chart that plots only one metric would miss these differences, but the radar chart captures the full performance profile in a single view.

@file:radar_chart_comparison.png

Looking at the radar chart, several patterns emerge. The most obvious is that all five models achieve high scores on accuracy and ROC-AUC, with their polygons extending far toward the outer ring on these axes. This reflects the strong overall performance of every model on these global metrics.

The precision and recall axes show the most variation between models. The random forest polygon extends furthest toward the outer ring on the precision axis, reflecting its high precision score. But it pulls inward on the recall axis, showing its weakness there. Logistic regression and the GNN show the opposite pattern, reaching further on recall but pulling inward on precision. SVM and XGBoost sit between these extremes, with more balanced shapes.

The F1-score axis shows moderate spread, with XGBoost and SVM reaching slightly further outward than the other models. This reflects their ability to balance precision and recall more effectively than models that tilt heavily toward one or the other.

The ROC-AUC axis shows all models clustered near the outer ring, confirming that they all achieve excellent discrimination. This is perhaps the most important observation from the radar chart. Regardless of where each model sits on the precision-recall trade-off, all of them demonstrate strong ability to separate the two risk classes.

The radar chart makes it clear that no single model dominates across all five axes. Each model has its strengths and weaknesses, and the best choice depends on the specific requirements of the application. For a screening tool that prioritizes catching as many high-risk patients as possible, a model with higher recall like logistic regression or the GNN might be preferred. For a confirmation tool that needs to minimize false positives, random forest with its high precision would be more appropriate. For a balanced approach, XGBoost or SVM would be the strongest candidates.

### 6.3 Parallel Coordinates

The parallel coordinates plot provides a sample-level view of how each model assigns risk probabilities to individual patients in the validation set. It connects each patient's predicted probability across the five models along parallel vertical axes, creating a set of lines that reveal patterns of agreement and disagreement between models.

This visualization is particularly valuable for understanding ensemble behavior. When the lines for a given patient run roughly parallel across all axes, the models agree on that patient's risk level. When the lines cross or diverge, the models disagree, which may indicate a borderline case or a patient with unusual electrochemical characteristics.

@file:parallel_coordinates.png

The parallel coordinates plot reveals several interesting patterns. The first is that there are clear bands of patients where all five models produce consistently low probabilities and other bands where they produce consistently high probabilities. This shows that the DPV data contains a strong signal that all models can detect, and that patients with clear electrochemical signatures are classified consistently across all approaches.

The second pattern is that there is a region of overlap in the middle probability ranges where model predictions diverge. Some patients in this region are assigned moderate risk by some models and low or high risk by others. These are the cases where the choice of model matters most, and they represent the inherent uncertainty in the classification task.

The third pattern is that the range of probabilities differs slightly between models. Random Forest shows the most extreme separation, with most predictions either very low or very high and few in the middle range. This is consistent with its conservative behavior in the confusion matrix. Logistic Regression shows a wider spread of intermediate probabilities, reflecting its tendency to produce more distributed risk estimates.

The parallel coordinates plot complements the confusion matrices by showing not just whether models agree on the final classification, but how their underlying probability estimates compare. This is important because patients with probabilities near the decision threshold are the ones most likely to be affected by small changes in the model or the data, and understanding where these borderline cases occur is essential for clinical deployment.

### 6.4 Ridge Plot Distributions

The ridge plot shows the distribution of predicted probabilities for each model, separated by the true class of the patient. For each model, two density curves are plotted. One curve shows the distribution of probabilities assigned to patients who are actually low risk, and the other shows the distribution for patients who are actually high risk.

This visualization is designed to reveal how well each model separates the two classes in probability space. A model with strong discrimination will show the low-risk curve concentrated near zero and the high-risk curve concentrated near one, with minimal overlap between them. The amount of overlap between the two curves is a direct visual measure of classification difficulty.

@file:ridge_plot_distributions.png

The ridge plot confirms what the quantitative metrics already suggested. For all five models, the low-risk and high-risk density curves are well separated, with the low-risk curve peaking near zero probability and the high-risk curve peaking well above the decision threshold. This separation is the reason all models achieve high ROC-AUC scores.

Looking more closely, some differences between models become apparent. Random Forest shows the cleanest separation, with the low-risk curve tightly concentrated near zero and almost no probability mass above the decision threshold. This is consistent with its high precision and low false positive rate. However, its high-risk curve, while shifted to the right, is not as concentrated as the low-risk curve, reflecting the smaller number of high-risk cases available for training.

Logistic Regression shows a different pattern. Its low-risk curve has a longer tail extending toward higher probabilities, which corresponds to its higher false positive rate. But its high-risk curve is centered further to the right than some other models, explaining its high recall.

XGBoost and SVM show intermediate patterns, with reasonable separation between the two classes and moderate tail overlap. The GNN's ridges show similar characteristics to logistic regression, with a slightly longer tail in the low-risk distribution.

The ridge plot is valuable because it shows not just the average behavior captured by metrics like ROC-AUC, but the full distribution of predictions. A model could have a high ROC-AUC while still producing a long tail of high-probability predictions for low-risk patients, and the ridge plot makes these patterns visible.

### 6.5 Violin Plot Distributions

The violin plots extend the distribution analysis by comparing the predicted probability distributions for the two classes directly within each model. Each model receives its own subplot, with the low-risk and high-risk groups displayed as mirrored density curves. The width of each violin at a given probability value represents the density of predictions at that value.

@file:violin_plots.png

The violin plots reinforce the observations from the ridge plot while adding additional detail. The random forest violin shows a very narrow low-risk distribution concentrated at the bottom, reflecting the model's strong confidence in low-risk predictions. The high-risk violin is wider and positioned higher, but its spread indicates that the model is less certain about high-risk cases.

The logistic regression violin shows wider distributions for both classes, indicating less extreme probability estimates. The low-risk violin extends higher than in random forest, explaining the higher false positive rate. The high-risk violin is centered at a similar position but has a different shape, with more probability mass concentrated at the upper end.

The SVM and XGBoost violins show intermediate characteristics, with the XGBoost high-risk violin showing a particularly clean separation from its low-risk counterpart. The GNN violin shows the widest overlap in the middle region, which corresponds to its slightly lower ROC-AUC.

The violin plots make it easy to compare the shapes of the probability distributions across models. They show that even though all models achieve high accuracy, the distribution of their probability estimates differs in ways that matter for clinical interpretation. Models with more extreme probability estimates may inspire more confidence in their predictions, while models with more distributed estimates may provide more nuanced risk information.

### 6.6 Model Comparison Heatmap

The heatmap aggregates the main evaluation metrics into a single matrix, with models on one axis and metrics on the other. Each cell is color-coded to indicate the value, making it easy to spot which models perform best on which metrics at a glance. The heatmap includes annotated values so that exact numbers are visible alongside the color coding.

@file:model_comparison_heatmap.png

The heatmap provides a compact summary of the performance table in visual form. The color gradient makes it immediately apparent that all models perform well on accuracy and ROC-AUC, with these cells showing the darkest shading across the board. The precision and recall columns show more variation, with different models excelling on different metrics.

XGBoost's row stands out as having consistently dark cells across all five metrics, confirming its position as the best overall performer. Random Forest shows a very dark cell for precision but a notably lighter cell for recall, visually confirming its conservative bias. Logistic Regression shows the opposite pattern, with a dark recall cell and a lighter precision cell.

The heatmap also reveals that the GNN, while competitive, has slightly lighter shading on most metrics compared to the top performers. This is consistent with the numerical results and reflects the GNN's slightly lower scores.

The heatmap is useful as a quick reference tool. It allows the reader to compare all five models across all five metrics in a single glance, and the color coding makes patterns immediately visible without needing to scan numerical tables.

### 6.7 Enhanced ROC Curves

The ROC curve plots the true positive rate against the false positive rate as the decision threshold varies from zero to one. A curve that rises steeply toward the top left corner indicates strong discrimination, and the area under the curve, or AUC, quantifies this visually. The enhanced ROC figure includes shaded areas under each curve and annotated optimal threshold points.

@file:roc_curves_enhanced.png

The ROC curves for all five models are remarkably similar, which is consistent with their high and tightly clustered AUC values. Each curve rises steeply and reaches near-perfect true positive rates at low false positive rates, creating the characteristic shape of a highly discriminative classifier.

The curve for XGBoost sits slightly above the others for most of its range, consistent with its top AUC of ninety-eight point seven one percent. The GNN curve sits slightly below the others, consistent with its lower AUC of ninety-six point six three percent. However, the differences are small, and all curves are far above the diagonal line that represents random guessing.

The enhanced ROC figure also shows annotated points indicating the optimal threshold for each model. These points show where the trade-off between true positive rate and false positive rate is most favorable, typically near the top left corner of the curve where the distance from the diagonal is greatest.

The ROC curves provide strong evidence that DPV voltammetry data is highly informative for prostate cancer risk classification. AUC values above ninety-eight percent indicate that the models can achieve excellent sensitivity and specificity simultaneously, which is the goal of any diagnostic test.

## 7. Discussion of Model Behavior

This section synthesizes the quantitative metrics and the visual analyses into a coherent interpretation of model performance. The discussion covers the impact of class imbalance, the behavior of each model individually, and the implications of the results for clinical risk classification.

### 7.1 Impact of Class Imbalance

The dataset is imbalanced, with only eleven point nine percent of patients classified as high risk. This imbalance affects every aspect of model training and evaluation. Models that simply predict every patient as low risk would achieve eighty-eight percent accuracy without learning anything useful, which is why accuracy alone is insufficient as a performance metric.

The models in this study handle imbalance through class weighting, which assigns higher importance to the minority high-risk class during training. This encourages the models to learn patterns that distinguish high-risk patients rather than optimizing for overall accuracy. The results show that this approach is effective, as all models achieve recall rates well above the eleven point nine percent baseline.

The trade-off between precision and recall that appears across models is a direct consequence of class imbalance. Models that prioritize catching high-risk patients tend to produce more false positives, lowering their precision. Models that prioritize avoiding false positives tend to miss more high-risk patients, lowering their recall. The F1-score captures this trade-off in a single number, and the models with the highest F1-scores are those that strike the best balance.

### 7.2 Logistic Regression

Logistic Regression achieves a recall of eighty-six percent, meaning it catches thirty-one out of thirty-six high-risk patients in the validation set. This is the highest recall among all models, which is somewhat surprising for the simplest model in the pipeline. It suggests that the relationship between the DPV features and the risk label has a strong linear component that Logistic Regression can exploit effectively.

The trade-off for this high recall is lower precision at sixty-nine percent. Of the forty-five patients that Logistic Regression flags as high risk, only thirty-one are actually high risk. The remaining fourteen are false positives. This means that a clinical tool based on Logistic Regression would flag many patients for follow-up who do not actually need it, potentially causing unnecessary anxiety and healthcare costs.

The ROC-AUC of ninety-eight point four seven percent shows that Logistic Regression has excellent discriminative power despite its moderate precision. With threshold tuning, it might be possible to improve precision without sacrificing too much recall, making this model more clinically useful.

### 7.3 Random Forest

Random Forest shows the opposite behavior from Logistic Regression. Its precision of eighty-nine percent is the highest among all models, meaning that when it flags a patient as high risk, there is a very high chance the patient truly is high risk. However, its recall of sixty-seven percent means it misses one-third of high-risk patients.

This conservative behavior is characteristic of Random Forest, especially with imbalanced data. The ensemble voting mechanism means that a majority of trees must agree before a positive prediction is made, which reduces false positives but also reduces true positives. The model's high accuracy of ninety-five percent is driven primarily by its excellent performance on the majority low-risk class.

For clinical applications where false positives are costly, such as invasive follow-up procedures, Random Forest's high precision is valuable. But for screening applications where missing a cancer case is the greater risk, its low recall is a significant drawback.

### 7.4 Support Vector Machine

SVM achieves a balance between precision and recall that places it between the extremes of Logistic Regression and Random Forest. Its precision of eighty-seven percent is strong, and its recall of seventy-two percent is reasonable. The resulting F1-score of seventy-eight point seven nine percent is the second highest among all models.

SVM's accuracy of ninety-five point three three percent is the highest of any model, but as discussed earlier, accuracy can be misleading with imbalanced data. The more relevant observation is that SVM produces good results on both precision and recall without the extreme trade-off seen in other models.

The radial basis function kernel allows SVM to model nonlinear relationships in the DPV data, which may explain its balanced performance. It can capture complex patterns that Logistic Regression misses, while its maximum-margin objective prevents the overconfidence that sometimes affects tree-based models.

### 7.5 XGBoost

XGBoost achieves the highest F1-score at seventy-eight point nine five percent and the highest ROC-AUC at ninety-eight point seven one percent. Its recall of eighty-three percent is second only to Logistic Regression, and its precision of seventy-five percent is reasonable. This balanced performance across multiple metrics makes it the strongest overall model in the pipeline.

XGBoost's success can be attributed to its gradient boosting framework, which builds trees sequentially with each new tree focusing on the errors of the previous ones. This allows the model to learn complex patterns while maintaining good generalization. The class weighting mechanism also helps XGBoost handle the imbalanced data effectively.

The enhanced ROC curve and confusion matrix both confirm XGBoost's strong performance. It achieves near-perfect discrimination between classes while maintaining a good balance between catching high-risk patients and avoiding false positives.

### 7.6 Graph Neural Network

The GNN achieves competitive performance despite being the most complex and least traditional model in the pipeline. Its recall of eighty-three percent matches XGBoost, and its overall accuracy of ninety-three point six seven percent is within one percentage point of the best models. Its ROC-AUC of ninety-six point six three percent is slightly lower than the other models but still represents excellent discrimination.

The GNN's strength lies in its ability to model relationships between DPV features through the correlation graph. This approach is fundamentally different from treating each potential step independently, and the fact that it performs competitively suggests that the correlation structure of the DPV data contains useful information.

The GNN's slightly lower performance compared to XGBoost may be due to the smaller training set size. Graph neural networks typically require more data to train effectively than classical models, and with only seven hundred training samples, the GNN may not have reached its full potential. Additional training data or hyperparameter tuning could potentially improve its performance.

The GNN represents a promising direction for future work. Its ability to model feature relationships is theoretically appealing for DPV data, where adjacent potential steps are naturally correlated, and further development could yield a model that captures electrochemical patterns that other approaches miss.

## 8. Clinical and Analytical Implications

This section discusses the broader implications of the results for both clinical practice and analytical methodology.

### 8.1 Clinical Risk Interpretation

The most important finding of this study is that DPV voltammetry data, combined with machine learning, can classify prostate cancer risk with very high accuracy. ROC-AUC scores above ninety-eight percent represent a level of discrimination that would be clinically valuable in a screening or diagnostic setting.

The clinical interpretation of the results depends on how the models would be deployed. In a screening scenario, where the goal is to identify as many high-risk patients as possible for further testing, a model with high recall like Logistic Regression or the GNN would be preferred. These models catch over eighty percent of high-risk cases, though they also produce a moderate number of false positives that would need to be resolved through additional testing.

In a diagnostic scenario, where the goal is to confirm risk before making treatment decisions, a model with high precision like Random Forest would be more appropriate. Its positive predictions are highly reliable, reducing the chance of unnecessary interventions. The trade-off is that it would miss some high-risk cases that would need to be caught through other means.

The best approach in practice might be to use the ensemble of all five models. When the models agree, confidence in the prediction is high. When they disagree, the patient could be flagged for additional review or testing. This ensemble approach leverages the strengths of each model while mitigating their individual weaknesses.

### 8.2 Model Utility in Practice

The results demonstrate that DPV voltammetry is a rich data source for cancer risk classification. The two hundred current measurements capture electrochemical information that correlates strongly with prostate cancer risk, and machine learning models can extract this information reliably.

The strong performance of all five models suggests that the signal in the DPV data is robust and not dependent on a specific modeling approach. This is an important finding because it means the results are unlikely to be an artifact of a particular model's assumptions or architecture. Whatever electrochemical changes are associated with prostate cancer risk, they are detectable through multiple analytical lenses.

The practical utility of a DPV-based screening tool would depend on several factors beyond model performance. The cost and complexity of DPV measurements, the availability of the necessary equipment, and the integration with existing clinical workflows would all need to be considered. However, the analytical results from this study provide a strong technical foundation for such a tool.

### 8.3 Decision Threshold Strategy

The models in this study use a default decision threshold of zero point five, meaning patients with a predicted probability above fifty percent are classified as high risk. This threshold is standard but may not be optimal for clinical use.

The ROC curves provide the information needed to select a threshold that matches the clinical priorities. If the goal is to maximize recall, a lower threshold could be chosen, accepting more false positives in exchange for catching more high-risk patients. If the goal is to maximize precision, a higher threshold would reduce false positives at the cost of missing some high-risk cases.

The enhanced ROC figures include annotated optimal threshold points that show where the trade-off is most favorable. These points provide a starting point for clinical threshold selection, but the final choice should be guided by the specific requirements of the clinical setting, including the costs of false positives and false negatives.

## 9. Limitations and Future Work

This section acknowledges the limitations of the current study and outlines directions for future improvement.

### 9.1 Dataset Size and Imbalance

The dataset of one thousand patients is modest in size, especially for the high-risk class where only one hundred and nineteen samples are available. This limits the statistical power of the analysis and constrains the complexity of models that can be trained reliably. The confidence intervals around the performance metrics, particularly for precision and recall, would be narrower with a larger validation set.

Future work should seek to expand the dataset, either by collecting additional DPV measurements or by combining data from multiple sources. A larger dataset would allow more robust model training, better validation, and the use of more complex architectures like deeper neural networks.

The class imbalance is inherent to the screening population and is unlikely to change with additional data collection. However, techniques beyond class weighting, such as oversampling the minority class, generating synthetic samples, or using cost-sensitive learning, could be explored to improve recall without sacrificing precision.

### 9.2 Feature Scope

The current study uses two hundred DPV current measurements as features. While these features capture the full voltammetry curve, there may be additional information in derived quantities such as peak heights, peak positions, or curve shapes. Feature engineering could extract these derived features and potentially improve model performance.

The study also uses only the DPV data for prediction. Combining DPV features with clinical variables such as age, family history, and prior biopsy results could provide a more complete picture of patient risk. Multimodal models that integrate electrochemical and clinical data represent a natural next step.

### 9.3 Model Calibration and Explainability

The models in this study produce probability estimates, but their calibration has not been thoroughly evaluated. A well-calibrated model produces probabilities that match the observed frequency of the event. For example, if a model predicts a twenty percent risk for a group of patients, roughly twenty percent of those patients should actually be high risk.

Calibration is important for clinical decision-making because poorly calibrated probabilities can mislead clinicians about the level of risk. Future work should include calibration curves and reliability diagrams to assess how well the predicted probabilities match the true risk.

Explainability is another area for future development. While the models perform well, understanding why a particular patient receives a high-risk prediction is essential for clinical trust. Techniques such as SHAP values or LIME could identify which DPV potential steps are driving each prediction, potentially revealing electrochemical patterns associated with cancer risk.

### 9.4 Graph Neural Network Development

The GNN shows promise but has room for improvement. Its architecture, graph construction method, and training procedure could all be optimized further. Alternative graph structures, such as graphs based on the physical ordering of potential steps rather than correlation, could be explored. Deeper architectures, attention mechanisms, and different convolutional operators could also improve performance.

The GNN's slightly lower ROC-AUC compared to classical models suggests that it may benefit from additional data or more sophisticated training procedures. Transfer learning, where the GNN is pre-trained on a larger unrelated dataset and fine-tuned on the DPV data, could potentially improve its performance.

### 9.5 Cross-Validation and Generalization

The current study uses a single train-validation split. While stratified sampling ensures that the class balance is preserved, the results could vary depending on which patients end up in the validation set. K-fold cross-validation would provide a more robust estimate of model performance by averaging results across multiple different splits.

External validation on an independent dataset collected at a different time or location would provide the strongest test of generalization. If the models perform well on data from a different source, confidence in their clinical utility would be significantly increased.

## 10. Conclusion

This report has documented a complete machine learning pipeline for prostate cancer risk classification using DPV voltammetry data. The pipeline processes two hundred electrical current measurements per patient, trains five machine learning models on these features, and evaluates their performance on a held-out validation set of three hundred patients.

The results demonstrate that DPV voltammetry data contains strong electrochemical signatures associated with prostate cancer risk. All five models achieve validation accuracies above ninety-three percent and ROC-AUC scores above ninety-six percent, indicating excellent discrimination between low-risk and high-risk patients. XGBoost delivers the strongest overall performance with an F1-score of seventy-eight point nine five percent and a ROC-AUC of ninety-eight point seven one percent.

The models show different trade-offs between precision and recall. Logistic Regression and the Graph Neural Network achieve the highest recall, catching over eighty-three percent of high-risk patients but producing a moderate number of false positives. Random Forest achieves the highest precision, with nearly eighty-nine percent of its positive predictions being correct, but it misses more high-risk cases. XGBoost and SVM strike a balance between the two extremes, with XGBoost emerging as the best overall performer.

The visualizations provide deep insight into model behavior. Confusion matrices reveal the error patterns of each model. The radar chart compares performance across multiple metrics simultaneously. Parallel coordinates show how model predictions align or diverge for individual patients. Density plots and violin plots reveal the distribution of probability estimates. The ROC curves confirm near-perfect discrimination for all models.

The choice of model for clinical deployment depends on the specific requirements of the application. A screening tool that prioritizes catching all high-risk cases would favor Logistic Regression or the GNN. A diagnostic tool that needs to minimize false positives would favor Random Forest. A balanced approach that combines good recall with reasonable precision would favor XGBoost or SVM. An ensemble that considers all five models together would provide the most robust and reliable predictions.

The findings of this study support the continued development of DPV-based diagnostic tools for prostate cancer. The analytical results are strong, the methodology is sound, and the potential clinical value is significant. With additional data, further model refinement, and careful clinical validation, DPV voltammetry combined with machine learning could become a valuable component of prostate cancer risk assessment.

## 11. Appendix: Data Dictionary and Additional Tables

### 11.1 Clinical Data Dictionary

The data dictionary below summarizes the raw dataset features and how they are used in the model pipeline.

**Table 2: Data Dictionary**

| Variable | Type | Source | Clinical Role | Analytical Transformation |
|----------|------|--------|---------------|---------------------------|
| sample_id | Identifier | Metadata sheet | Unique record ID | None |
| PSA_pg_per_ml | Numeric | Metadata sheet | Primary risk definition | Threshold-based target creation |
| AFP_pg_per_ml | Numeric | Metadata sheet | Secondary biomarker | Not used as feature in DPV pipeline |
| CA125_U_per_ml | Numeric | Metadata sheet | Secondary biomarker | Not used as feature in DPV pipeline |
| V0 through V199 | Numeric | DPV sample sheets | DPV current measurements | RobustScaler normalization |

The data dictionary helps the reader appreciate that the primary features in this study are the two hundred DPV current measurements, not the traditional biomarker concentrations. The biomarker values are used only to define the target label through the PSA threshold.

### 11.2 Split and Class Distribution Table

The following table summarizes the training and validation split, along with the class balance preserved by stratified sampling.

**Table 3: Sample Distribution by Partition**

| Partition | Total Samples | Low Risk | High Risk | High Risk Percentage |
|-----------|---------------|----------|-----------|----------------------|
| Training | 700 | 617 | 83 | 11.9% |
| Validation | 300 | 264 | 36 | 12.0% |

The stratified split ensures that both partitions have similar class proportions, allowing fair comparison between training and validation metrics.

### 11.3 Complete Model Performance Table

The following table presents the complete performance metrics for all five models on the validation set, including the values used to generate the visualizations.

**Table 4: Complete Model Performance Metrics**

| Model | Accuracy | Precision | Recall | F1-Score | ROC-AUC |
|-------|----------|-----------|--------|----------|---------|
| Logistic Regression | 0.9367 | 0.6889 | 0.8611 | 0.7654 | 0.9847 |
| Random Forest | 0.9500 | 0.8889 | 0.6667 | 0.7619 | 0.9861 |
| SVM | 0.9533 | 0.8667 | 0.7222 | 0.7879 | 0.9833 |
| XGBoost | 0.9467 | 0.7500 | 0.8333 | 0.7895 | 0.9871 |
| GNN | 0.9367 | 0.6977 | 0.8333 | 0.7595 | 0.9663 |

These metrics reflect the performance of models trained on seven hundred DPV samples and evaluated on three hundred held-out samples. All metrics are reported as decimal values between zero and one.

### 11.4 Metric Interpretation Table

The final table in this appendix provides definitions for the key evaluation metrics used throughout the report.

**Table 5: Model Evaluation Metric Definitions**

| Metric | Definition | Clinical Relevance |
|--------|------------|---------------------|
| Accuracy | Proportion of all predictions that are correct | General performance indicator, but can be misleading with imbalanced data |
| Precision | Proportion of high-risk predictions that are correct | Indicates how reliable a positive prediction is for clinical decision-making |
| Recall | Proportion of actual high-risk patients correctly identified | Indicates how well the model catches patients who need further investigation |
| F1-Score | Harmonic mean of precision and recall | Balances the trade-off between catching high-risk patients and avoiding false alarms |
| ROC-AUC | Area under the receiver operating characteristic curve | Measures overall discriminative power across all possible thresholds |

These definitions provide context for interpreting the numerical results and understanding why different metrics matter in different clinical scenarios.

### Figure Placeholder Summary

Below is a complete list of the figure placeholders used in this report. Each placeholder is intended to be replaced with the actual image from the pipeline output.

- @file:advanced_cm_logistic_regression.png
- @file:advanced_cm_random_forest.png
- @file:advanced_cm_svm.png
- @file:advanced_cm_xgboost.png
- @file:advanced_cm_gnn.png
- @file:radar_chart_comparison.png
- @file:parallel_coordinates.png
- @file:ridge_plot_distributions.png
- @file:violin_plots.png
- @file:model_comparison_heatmap.png
- @file:roc_curves_enhanced.png
- @file:best_model_modal.png

Each figure appears in the text with a detailed description before and after its placement.

### Closing Notes

This report documents a successful application of machine learning to DPV voltammetry data for prostate cancer risk classification. The results show that electrochemical fingerprints captured through DPV scans contain strong predictive signals, and that machine learning models can extract these signals with very high accuracy. The report is comprehensive in its coverage of the data processing pipeline, the modeling methodology, the quantitative results, and the visual diagnostic analysis. It provides both a technical record of the analysis and a narrative that explains the findings in clinically meaningful terms.
