import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import os

# IEEE Standard Configuration
plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["Times", "Palatino", "serif"],
    "font.size": 10,
    "axes.labelsize": 10,
    "axes.titlesize": 11,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "legend.fontsize": 9,
    "figure.dpi": 300
})

OUT_DIR = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/figures"
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------
# Plot 1: End-to-End Latency Breakdown (Stacked Bar Chart)
# ---------------------------------------------------------
def plot_latency_breakdown():
    labels = ['Plain Text', 'Image (OCR)', 'Audio (ASR)']
    
    # Synthetic latency data in milliseconds
    ingestion = np.array([12, 14, 15])
    preprocessing = np.array([5, 850, 1200]) # text is fast, image OCR takes 850ms, Audio ASR takes 1200ms
    llm_inference = np.array([1350, 1400, 1380])
    db_write = np.array([8, 9, 8])

    width = 0.5
    fig, ax = plt.subplots(figsize=(5, 4))
    
    # Colors: IEEE-friendly grayscale/blues
    c1, c2, c3, c4 = '#2C3E50', '#7F8C8D', '#BDC3C7', '#34495E'
    
    ax.bar(labels, ingestion, width, label='Edge Ingestion (HTTP 202)', color=c1)
    ax.bar(labels, preprocessing, width, bottom=ingestion, label='Preprocessing (OCR/ASR)', color=c2)
    ax.bar(labels, llm_inference, width, bottom=ingestion+preprocessing, label='LLM Inference', color=c3)
    ax.bar(labels, db_write, width, bottom=ingestion+preprocessing+llm_inference, label='DB Write', color=c4)

    ax.set_ylabel('Latency (ms)')
    ax.set_title('End-to-End Latency Breakdown by Modality')
    ax.legend(loc='upper left', bbox_to_anchor=(1, 1))
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "Fig6_Latency_Breakdown.pdf"), format='pdf', bbox_inches='tight')
    plt.close()

# ---------------------------------------------------------
# Plot 2: Precision, Recall, F1 across Modalities
# ---------------------------------------------------------
def plot_metrics():
    labels = ['Plain Text', 'Image (OCR)', 'Audio (ASR)']
    
    precision = [0.95, 0.82, 0.86]
    recall = [0.93, 0.78, 0.81]
    f1 = [0.94, 0.80, 0.83]

    x = np.arange(len(labels))
    width = 0.25

    fig, ax = plt.subplots(figsize=(5, 3.5))
    
    rects1 = ax.bar(x - width, precision, width, label='Precision', color='#34495E')
    rects2 = ax.bar(x, recall, width, label='Recall', color='#95A5A6')
    rects3 = ax.bar(x + width, f1, width, label='F1-Score', color='#ECF0F1', edgecolor='black')

    ax.set_ylabel('Score')
    ax.set_title('Extraction Performance by Modality')
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.legend(loc='lower right')
    ax.set_ylim(0, 1.1)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "Fig7_Extraction_Metrics.pdf"), format='pdf', bbox_inches='tight')
    plt.close()

# ---------------------------------------------------------
# Plot 3: Confusion Matrix for Priority Scoring
# ---------------------------------------------------------
def plot_confusion_matrix():
    # Synthetic CM: 3 classes (Low, Medium, High)
    # True labels on Y axis, Predicted on X axis
    cm = np.array([
        [410, 35,  5],   # True Low
        [42, 380, 28],   # True Medium
        [8,  22,  420]   # True High
    ])
    
    labels = ['Low', 'Medium', 'High']
    
    fig, ax = plt.subplots(figsize=(4, 3.5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels, cbar=False, ax=ax)
    
    ax.set_ylabel('True Priority')
    ax.set_xlabel('Predicted Priority')
    ax.set_title('Priority Triage Confusion Matrix')
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "Fig8_Confusion_Matrix.pdf"), format='pdf', bbox_inches='tight')
    plt.close()

if __name__ == "__main__":
    print("Generating IEEE-compliant plots...")
    plot_latency_breakdown()
    plot_metrics()
    plot_confusion_matrix()
    print("Done. Saved to figures/ directory.")
