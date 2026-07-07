# II. RELATED WORK

This section provides a comprehensive review of the literature and existing technological frameworks relevant to the development of Chatnalyxer. The discussion is categorized into nine pivotal domains, critically analyzing the existing approaches, their respective advantages and limitations, and the specific research gaps that Chatnalyxer aims to address.

## A. Information Extraction

**Existing Approaches:** Information Extraction (IE) is a foundational subfield of Natural Language Processing (NLP) dedicated to automatically extracting structured information from unstructured or semi-structured machine-readable documents. Early approaches relied heavily on hand-crafted linguistic rules and regular expressions to identify specific entities. Subsequent generations of IE systems utilized traditional machine learning algorithms, such as Hidden Markov Models (HMMs) and Conditional Random Fields (CRFs) [1]. More recently, the state-of-the-art has been dominated by deep learning architectures, particularly Bidirectional Long Short-Term Memory (BiLSTM) networks coupled with CRFs, and transformer-based architectures like BERT (Bidirectional Encoder Representations from Transformers) [2]. These modern systems frame IE primarily as a sequence labeling task.

**Advantages:** Modern deep learning-based IE systems exhibit exceptionally high accuracy when operating within specific, well-defined domains. For instance, models trained on formal corpora, such as financial news, medical records, or corporate emails, can identify named entities (persons, organizations, locations) with precision rates often exceeding 90%. Rule-based approaches, while older, remain advantageous in environments requiring extremely low-latency inference and predictable, deterministic outputs for highly structured text [3]. 

**Limitations:** The primary limitation of traditional and contemporary IE systems is their fragility when exposed to out-of-domain data or informal, unstructured text. They require massive, domain-specific annotated datasets for training, making them inflexible [4]. In the context of instant messaging, where text is characterized by colloquialisms, abbreviations, typographical errors, and a lack of standard punctuation, traditional NER (Named Entity Recognition) models degrade significantly. The rigid classification taxonomies used in formal IE do not readily apply to the dynamic nature of casual conversation.

**Research Gap:** There exists a significant research gap in developing generalized, robust IE frameworks capable of dynamically adapting to the noisy, colloquial, and multi-lingual nature of informal group chats. Current systems require constant retraining to handle linguistic drift in casual communication. A system that can perform highly accurate extraction on conversational text without relying on rigid, pre-trained sequence labeling is necessary.

## B. Event Extraction

**Existing Approaches:** Event Extraction (EE) extends basic entity recognition by attempting to identify instances of specific event types and their associated arguments (participants, times, locations) within text. Existing methodologies are broadly divided into pipeline models and joint models. Pipeline models first detect an "event trigger" (the word invoking the event) and subsequently classify the surrounding entities as arguments [5]. Joint models, conversely, attempt to extract triggers and arguments simultaneously using multi-task learning frameworks to capture the dependencies between them [6]. These systems are heavily benchmarked on standardized datasets like ACE-2005.

**Advantages:** EE systems are excellent at capturing complex, structured relationships between multiple entities within a document. They excel in scenarios where events follow a predictable ontology, such as identifying a "Corporate Acquisition" event and correctly linking the acquiring company, the acquired company, and the transaction date within a formal news article. This relational understanding provides a much deeper semantic analysis than simple entity tagging.

**Limitations:** The fundamental limitation of traditional EE is its reliance on predefined, rigid event ontologies. Conversational events in student or professional group chats (e.g., "The physics assignment is due tomorrow," or "Let's move the meeting to 5 PM") do not map cleanly to standard ontological categories like those found in ACE-2005 [7]. Furthermore, conversational EE is complicated by the fact that arguments are frequently scattered across multiple, fragmented messages from different participants, whereas traditional models assume the event and its arguments are contained within a single sentence or paragraph.

**Research Gap:** The literature indicates a pressing need for zero-shot or open-domain event extraction tailored specifically to spontaneous, organizational tasks. There is a gap in architectures capable of synthesizing fragmented conversational threads to reconstruct a cohesive temporal event without being constrained by a rigid, predefined academic ontology.

## C. Temporal Information Extraction

**Existing Approaches:** Temporal Information Extraction focuses specifically on identifying, normalizing, and grounding temporal expressions within text. The TimeML annotation standard provides the foundational framework for this task [8]. Prominent existing systems, such as HeidelTime and SUTime, utilize a combination of sophisticated rule-based linguistic patterns and machine learning to extract temporal expressions and normalize them into standardized formats, such as the ISO-8601 standard [9]. 

**Advantages:** Systems like SUTime and HeidelTime are highly precise when processing explicit temporal markers. If a document contains strings such as "January 15, 2026," or "14:30 EST," these systems can extract and parse them with near-perfect accuracy. Their reliance on deterministic rules ensures that their output is consistently formatted, which is critical for downstream calendar or database integration.

**Limitations:** The Achilles' heel of standard temporal extractors is relative and deictic temporal expressions—words like "tomorrow," "next week," or "in two hours." To resolve these, the system must know the precise Reference Time (document creation time). In instant messaging, the reference time changes with every single message. Furthermore, these systems are easily broken by the hyper-informal shorthand used in chats (e.g., "tmrw," "2moro," "next tues"). They lack the semantic flexibility to infer time from highly ambiguous conversational context [10].

**Research Gap:** There is a distinct lack of temporal extraction systems that natively and dynamically ingest the precise UTC timestamp of individual messages to resolve hyper-informal, relative temporal expressions in real-time. A mechanism that combines chronological metadata with deep semantic understanding is required to parse the temporal ambiguity inherent in chat streams.

## D. NLP for Messaging Apps

**Existing Approaches:** The application of NLP to messaging platforms has predominantly manifested in the development of conversational agents (chatbots) and intent classification systems. Frameworks like Dialogflow, Rasa, and Microsoft Bot Framework allow developers to build systems that parse user input, classify the user's intent, and extract necessary parameters (slots) to generate a response [11]. Other approaches involve applying sentiment analysis and topic modeling to large conversational corpora extracted from platforms like Twitter or Reddit to gauge public opinion [12].

**Advantages:** Intent classification systems are highly optimized for real-time processing and are exceptionally good at facilitating human-computer interaction. They allow users to execute commands or retrieve information using natural language. Sentiment analysis tools provide valuable macro-level insights into the emotional tone or prevailing topics within large-scale digital communities.

**Limitations:** Chatbots and intent classifiers are fundamentally designed for dyadic (one-on-one), turn-based human-computer interaction. They require the user to explicitly invoke them and speak in a manner the bot understands. They are wholly unsuited for the passive observation of multi-party human-human interaction, which characterizes group chats [13]. Group chats feature intertwined conversation threads, rapid context switching, and implicit knowledge that breaks standard dialogue state tracking models.

**Research Gap:** Current literature focuses on active conversational agents. There is a substantial gap regarding passive NLP monitoring tools designed to operate invisibly within multi-party conversational streams. Research is needed on systems that can extract actionable tasks from human-human dialogue without requiring users to invoke a bot using explicit commands or syntax.

## E. Large Language Models

**Existing Approaches:** The landscape of NLP has been revolutionized by Large Language Models (LLMs) such as OpenAI's GPT-4, Meta's LLaMA, and Google's Gemini [14]. These models, based on the transformer architecture and trained on massive corpora of text, have moved the field from task-specific supervised training to generalized prompt engineering. Existing approaches utilize LLMs for a vast array of tasks—including summarization, translation, and extraction—using zero-shot or few-shot prompting techniques, where the model infers the task parameters purely from the input context [15].

**Advantages:** LLMs possess unprecedented semantic understanding and contextual reasoning capabilities. Unlike traditional models, they can effortlessly parse highly ambiguous, noisy, and colloquial text. They exhibit excellent zero-shot extraction capabilities, meaning they can identify and format tasks from conversational text without requiring fine-tuning on custom datasets. They can also seamlessly handle multi-lingual inputs and correct typographical errors on the fly.

**Limitations:** Despite their power, LLMs present significant challenges for real-time application integration. They suffer from high latency and significant computational cost compared to traditional algorithms [16]. They possess strict context window limitations, making it difficult to process massive conversational histories at once. Furthermore, LLMs are susceptible to "hallucination"—generating plausible but incorrect data—if not constrained by strict prompt architectures and JSON schemas. Finally, sending personal chat data to third-party cloud APIs raises substantial privacy concerns.

**Research Gap:** While the capabilities of LLMs are well-documented, there is a gap in architectural patterns that utilize commercial LLMs specifically for ephemeral, privacy-preserving task extraction in high-volume, real-time chat streams. Research is required on prompt optimization techniques that minimize latency and strictly constrain LLM output to prevent hallucination in temporal event extraction.

## F. Optical Character Recognition (OCR) Systems

**Existing Approaches:** Optical Character Recognition (OCR) technology translates scanned images of text into machine-readable characters. Existing approaches range from traditional computer vision tools like Tesseract, which rely on pattern recognition and feature extraction, to advanced, cloud-based deep learning APIs such as Azure Vision, Google Cloud Vision, and AWS Textract [17]. Modern systems utilize Convolutional Neural Networks (CNNs) to achieve high accuracy even under challenging visual conditions.

**Advantages:** Modern deep learning OCR APIs provide exceptionally high accuracy on a wide variety of visual media. They can successfully extract text from low-resolution images, heavily skewed photographs, and even diverse styles of human handwriting [18]. This capability is critical because much organizational information is shared via images, such as photos of physical whiteboards, syllabi, or event flyers.

**Limitations:** OCR systems traditionally operate in isolation from downstream semantic analysis; they produce raw, unformatted text strings. In the context of a WhatsApp group chat, users share a massive volume of images—memes, screenshots, personal photos—that contain text but are entirely irrelevant to task management. Processing every image through an OCR engine and a subsequent NLP pipeline is computationally expensive and introduces significant latency [19]. 

**Research Gap:** There is a need for intelligent, multi-modal triage systems that integrate OCR directly with an LLM pipeline. The gap lies in developing architectures that can rapidly and cost-effectively discern whether an image likely contains a schedule or deadline versus irrelevant visual noise in real-time chat environments, thereby optimizing computational resources.

## G. Speech Recognition

**Existing Approaches:** Automatic Speech Recognition (ASR) involves the translation of spoken language into text. Historically dominated by Hidden Markov Models (HMMs) combined with Gaussian Mixture Models, the field has transitioned to end-to-end deep learning architectures [20]. Systems like OpenAI's Whisper and Azure Cognitive Speech utilize transformer-based models and massive multi-lingual datasets to achieve human-level transcription accuracy across diverse acoustic environments.

**Advantages:** Modern ASR systems can accurately transcribe multi-lingual speech, handle heavy accents, and filter out significant background noise. They are essential for capturing data from voice notes, a medium that has become increasingly popular in instant messaging due to its convenience and speed. Integrating ASR ensures that systems remain accessible and comprehensive.

**Limitations:** The primary limitation of applying ASR to messaging apps is the latency associated with processing long audio files. Furthermore, the output of ASR systems often lacks proper punctuation, capitalization, and formatting [21]. Conversational speech is inherently messy, filled with disfluencies (e.g., "ums," "ahs," false starts, and self-corrections). This acoustic and linguistic noise makes downstream information extraction significantly more difficult than processing typed text.

**Research Gap:** Current literature highlights a gap in pipelines capable of taking raw, unpunctuated, and disfluent conversational transcripts from casual voice notes and accurately extracting structured temporal tasks. There is a need for research demonstrating how LLMs can effectively serve as a semantic smoothing layer over noisy ASR outputs in productivity applications.

## H. Productivity Applications

**Existing Approaches:** The market is saturated with sophisticated productivity and task management applications. These range from digital calendar platforms (Google Calendar, Outlook) to Kanban-based project management tools (Trello, Asana) and flexible, block-based workspaces (Notion, Todoist) [22]. These applications provide the structural frameworks necessary for users to organize tasks, set reminders, and manage deadlines.

**Advantages:** These applications offer robust, highly refined organizational frameworks. They provide rich graphical user interfaces, cross-platform synchronization, collaboration features, and highly reliable push notification systems. They excel at presenting structured data in an easily consumable format, allowing users to visualize their schedules and prioritize their workloads effectively.

**Limitations:** The critical limitation of all traditional productivity applications is their absolute reliance on active manual data entry [23]. They require the user to serve as the functional bridge between the communication medium (where the task is assigned) and the organizational medium (where the task is tracked). This context switching introduces significant friction. If a user is distracted or procrastinates, the data is never entered, rendering the productivity application useless. High input friction is the primary cause of system abandonment.

**Research Gap:** There is a distinct research gap concerning systems that eliminate manual data entry by passively and autonomously bridging the communication layer (chat) and the productivity layer (calendar/notifications). The field requires exploration into "invisible" productivity tools that structure data automatically without demanding active user engagement.

## I. Existing WhatsApp Automation Systems

**Existing Approaches:** Programmatic interaction with the WhatsApp network is achieved through two primary avenues: the official WhatsApp Business API, and unofficial web-scraping libraries such as Baileys or standard Selenium-based wrappers [24]. Existing automation systems built on these frameworks predominantly consist of rule-based auto-responders, customer service chatbots, and bulk-messaging marketing tools designed for corporate entities.

**Advantages:** These systems successfully allow for programmatic reading and writing to the WhatsApp network. The official Business API provides a highly stable, structured, and legally compliant framework for large-scale enterprise communication, offering robust message templates and analytics. Unofficial libraries like Baileys provide lightweight, WebSocket-based access to individual user accounts, enabling custom integrations.

**Limitations:** The official Business API is prohibitively expensive, highly restrictive regarding message content, and explicitly designed for business-to-consumer interaction; it cannot be used by a standard end-user to monitor their own personal group chats [25]. Conversely, tools built on unofficial libraries are mostly rudimentary auto-responders lacking semantic intelligence. They are incapable of sophisticated NLP extraction and are generally used for spam or simple keyword-based replies rather than complex data processing.

**Research Gap:** A significant gap exists in the development of secure, non-commercial frameworks that leverage unofficial WebSocket connections (like Baileys) purely for intelligent, passive, multi-modal task extraction for individual users. Research is needed on architectures that utilize these connections not for outbound marketing, but for inbound, semantic organization, acting as a personal, AI-driven administrative assistant operating on top of a standard user account.
