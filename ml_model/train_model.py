import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

def create_and_save_model():
    print("--- Starting Model Training ---")

    # 1. Load Data
    try:
        df = pd.read_csv('Clean_Dataset.csv')
        print("1. Dataset loaded successfully.")
    except FileNotFoundError:
        print("ERROR: 'Clean_Dataset.csv' not found. Please put it in the same folder.")
        return

    # 2. Select Features
    # These are the specific columns we need from the dataset
    features = ['airline', 'source_city', 'destination_city', 'stops', 'class', 'duration', 'days_left']
    target = 'price'

    X = df[features]
    y = df[target]

    # 3. Define the Pipeline Logic
    # This ensures your friend doesn't have to manually convert text to numbers
    categorical_features = ['airline', 'source_city', 'destination_city', 'stops', 'class']
    numerical_features = ['duration', 'days_left']

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])

    # 4. Create the Bundle (Preprocessor + Model)
    # n_jobs=-1 uses all your CPU cores to train faster
    model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(
            n_estimators=50,      # Reduced from 100
            max_depth=12,         # Limits how deep the trees grow (Critical for size)
            n_jobs=-1, 
            random_state=42
        ))
    ])

    # 5. Train
    print("2. Training the Random Forest model... (This usually takes 1-3 minutes)")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model_pipeline.fit(X_train, y_train)
    
    score = model_pipeline.score(X_test, y_test)
    print(f"3. Training Complete. Model Accuracy (R2 Score): {score:.2f}")

    # 6. Save as a single Pickle file
    output_file = 'flight_price_pipeline.pkl'
    with open(output_file, 'wb') as f:
        pickle.dump(model_pipeline, f)
    
    print(f"4. SUCCESS! File '{output_file}' created.")
    print("   Send this .pkl file to your friend.")

if __name__ == "__main__":
    create_and_save_model()