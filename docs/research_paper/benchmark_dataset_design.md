# XVI. BENCHMARK DATASET DESIGN

To rigorously evaluate the multi-modal extraction capabilities of Chatnalyxer, a novel, specialized benchmark dataset—designated the **Chatnalyxer Evaluation Corpus (CEC-10K)**—was mathematically designed. Existing Natural Language Processing datasets (such as CoNLL-2003 or OntoNotes) are structurally insufficient for this domain; they focus heavily on formalized text (e.g., news articles) and lack the severe informality, extreme temporal ambiguity, and multi-modal nature inherent to modern instant messaging. The CEC-10K is specifically engineered to stress-test the pipeline across these vectors.

## A. Modality Distribution

The corpus consists of exactly 10,000 distinct message payloads, artificially engineered to mirror the statistical distribution of organic academic and professional group chats, heavily skewed towards conversational noise (80% non-task, 20% task-bearing).

1.  **Text Messages (60%):** The primary modality. This subset is heavily injected with typographical errors, extreme slang (e.g., "rn", "asap"), code-switching, and absence of terminal punctuation to simulate rapid mobile typing.
2.  **Images (20%):** Designed to test the Spatial Flattening algorithms and OCR capabilities. This subset includes high-fidelity screenshots of calendars, low-light photographs of classroom whiteboards, heavily skewed images of handwritten planner notes, and image-based internet memes (as adversarial noise).
3.  **Voice Notes (10%):** Synthesized audio files designed to stress the ASR pipeline. These files vary from 5 seconds to 2 minutes in duration and are artificially layered with acoustic noise (e.g., wind, cafe background chatter, subway rumble). The speech heavily features conversational disfluencies ("um", "wait no").
4.  **PDFs (10%):** Designed to test structural chunking. This subset includes multi-page academic syllabi, project rubrics, and highly structured, tabular work schedules.

## B. Ground Truth and Labeling Taxonomy

Every payload within the CEC-10K is meticulously annotated by human reviewers to establish a rigid ground truth for the LLM to be evaluated against. The annotation schema is multi-dimensional:

1.  **Task Labels:**
    *   *Binary Classification:* `True` (Actionable task exists) or `False` (Conversational noise).
    *   *Semantic Boundary:* The precise string isolating the core task description, stripped of conversational padding.
2.  **Priority Labels:**
    *   Determined by human consensus based on the temporal proximity and linguistic severity of the task. Annotated strictly as `HIGH`, `MEDIUM`, or `LOW`.
3.  **Deadline Types:**
    To evaluate the Temporal Resolution capabilities, the ground truth deadlines are categorized into three distinct types:
    *   *Type A (Absolute):* Explicit date and time (e.g., "November 5th at 8:00 AM").
    *   *Type B (Relative):* Dependent entirely on the message $T_0$ (e.g., "tomorrow afternoon", "in three days").
    *   *Type C (Ambiguous):* Lacking explicit boundaries (e.g., "due next time we meet", "sometime next week").
4.  **Difficulty Levels:**
    Each task is assigned a heuristic difficulty rating to isolate failure cases during evaluation.
    *   *L1 (Explicit):* Direct, unambiguous directives ("Submit the paper by 5 PM").
    *   *L2 (Implicit):* Casual phrasing requiring deductive reasoning ("Yeah, we should probably finish the code tonight").
    *   *L3 (Adversarial):* Sarcasm, hypothetical statements, or cancelled tasks designed to trigger LLM hallucinations ("Imagine if it was due tomorrow lol").

## C. Dataset Split (Training, Validation, Testing)

Unlike traditional Deep Learning methodologies that require massive datasets to iteratively update neural network weights, Chatnalyxer relies on a foundational Large Language Model (Google Gemini) executing zero-shot extraction. Therefore, the traditional 80/10/10 split is architecturally inappropriate. The CEC-10K implements the following split:

1.  **Training Set (0%):** Because the underlying LLM weights are frozen and accessed via a SaaS API, no dataset is allocated for traditional model training or fine-tuning.
2.  **Validation Set (10% - 1,000 payloads):** This subset is utilized exclusively for **Prompt Tuning**. During the development phase, the system architects run this set through the pipeline to iteratively refine the System Persona, adjust the Temporal Anchoring wording, and select the optimal Few-Shot examples to inject into the LLM context envelope. Hyperparameters (like `temperature = 0.0`) are locked based on performance against this set.
3.  **Testing Set (90% - 9,000 payloads):** This massive hold-out set is strictly embargoed during the development and prompt engineering phases. It is utilized exactly once during the final Experimental Evaluation to generate the definitive Precision, Recall, and F1 metrics, guaranteeing that the pipeline is evaluated against completely unseen conversational scenarios without risking data leakage or prompt overfitting.

## D. Design Rationale

The rigorous, highly engineered design of the CEC-10K dataset is motivated by the necessity to push the Chatnalyxer architecture to its absolute failure points. 

If the system was evaluated on a dataset consisting entirely of clean, explicit text ("Submit homework by Friday"), it would yield an artificially inflated F1 score of nearly 1.0, failing to reflect real-world performance. By actively designing the dataset to include *Adversarial (L3)* difficulty levels, simulated acoustic noise, and spatial OCR disorientation, researchers can mathematically prove the necessity of the system's fault-tolerance mechanisms (e.g., the JSON Fallback Retry Loop). Furthermore, classifying the deadlines into distinct types (Absolute vs. Relative) allows researchers to execute surgical ablation studies, isolating and proving that the novel Chronometadata Injection technique is specifically responsible for the system's success in resolving relative conversational ambiguity.
