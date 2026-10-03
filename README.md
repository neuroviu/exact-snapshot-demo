NeuroViu™ Bridge

Small AI for frontline care.

NeuroViu Bridge is an offline-first, bilingual AI-assisted documentation system designed to support frontline health workers in low-connectivity settings.

Developed by NeuroViu Labs.

The Problem

Frontline health workers may operate in environments where internet connectivity is unreliable, clinical documentation is burdensome, and cloud-based AI tools are not consistently accessible.

Patient conversations also begin as unstructured information that must be converted into useful records.

NeuroViu Bridge explores a simple question:

What if useful healthcare AI lived on the device instead of depending on the cloud?

The Solution

NeuroViu Bridge converts patient-reported information in English or French into a structured encounter draft while keeping the health worker in control.

The workflow is:

Patient Text → NeuroViu Edge AI → Grounding & Safety Layer → Human Review → Local-First Health Record → Sync When Connected

The system uses an adaptive edge-AI architecture. Rather than requiring every device to run the same model, NeuroViu Bridge selects a local processing approach appropriate for the device.

Mobile Devices

On supported mobile devices, NeuroViu Bridge uses:

SmolLM2-135M-Instruct

Model ID: HuggingFaceTB/SmolLM2-135M-Instruct

Quantization: INT8

Model download: approximately 133 MiB (~140 MB)

Runtime: Transformers.js / ONNX Runtime Web

Execution: WebAssembly inside a Web Worker

Inference: on-device after initial model preparation

Internet required for inference after preparation: No

The smaller mobile model was selected to reduce memory and compute requirements while preserving useful local language-processing capability.

Capable Desktop/Laptop Devices

On capable computers, NeuroViu Bridge can use:

Qwen2.5-0.5B-Instruct

with quantized local deployment.

The implementation supports WebGPU acceleration where compatible hardware and browser capabilities are available, with a CPU-based path when necessary.

Approximate model sizes vary by execution path:

q4f16 WebGPU: ~461 MiB

q4 CPU: ~750 MiB

Basic Offline Processing

If the selected language model is unavailable or fails to load, NeuroViu Bridge can use a clearly identified Basic Offline Processing Mode.

This mode uses deterministic keyword-based processing rather than pretending that generative-model inference is occurring.

The core documentation workflow can therefore degrade gracefully instead of failing completely.

NeuroViu Edge AI Architecture

Patient Text
      ↓
Device-Aware Model Selection
      ↓
┌───────────────────────────────────────┐
│ Mobile: SmolLM2-135M INT8             │
│ Capable Computer: Qwen2.5-0.5B        │
│ Fallback: Basic Offline Processing    │
└───────────────────────────────────────┘
      ↓
Grounding & Safety Layer
      ↓
Human Review
      ↓
Local-First Health Record
      ↓
Pending Sync
      ↓
Sync When Connected

This architecture follows a simple design principle:

Use the smallest processing approach the device can reliably support.

What the AI Does

NeuroViu Bridge focuses on a narrow documentation task.

It can structure patient-reported information into fields such as:

Main concern

Duration

Symptoms reported

Relevant context

Missing information

Uncertainty

The resulting output is an AI-assisted draft, not a completed clinical decision.

What the AI Does NOT Do

NeuroViu Bridge does not:

Diagnose patients

Generate differential diagnoses

Prescribe medication

Recommend treatment

Replace healthcare professionals

Make final clinical decisions

The health worker remains responsible for reviewing and approving the encounter.

The AI assists. The human decides.

Grounding & Safety Layer

Generative models can produce information that was never stated by the patient.

NeuroViu Bridge therefore separates generation from verification.

Model-generated field values are compared against the patient's original text. The current prototype uses a deterministic grounding safeguard that keeps model output only when sufficient content is supported by the patient's report.

If the generated content does not meet the grounding threshold, the system falls back to a deterministic value rather than silently accepting unsupported AI output.

Why This Matters

During prototype testing, the model generated the symptom “headache” even though the patient had not reported a headache.

The grounding safeguard rejected the unsupported information.

This test reinforced a core design decision:

The model that generates information should not be the only mechanism responsible for verifying it.

Human in the Loop

Every AI-generated encounter draft requires human review.

The health worker can:

Review the structured information

Identify missing or incorrect information

Edit the draft

Approve the encounter

Save the approved record locally

The AI is therefore a documentation assistant rather than an autonomous clinical decision-maker.

Offline-First Design

NeuroViu Bridge is implemented as a Progressive Web App with an offline-first architecture.

The local AI model requires an initial download while connectivity is available.

Once the selected model has been downloaded and cached, supported devices can perform model inference locally without contacting a cloud AI service.

Core capabilities include:

Local AI inference after model preparation

Local encounter creation

Local record persistence

Offline access to saved encounters

Human review and approval

Pending-sync state

English/French interface

Grounding safeguards

Deterministic fallback processing

Offline behavior can still vary by browser and device capabilities.

Verified Mobile Offline Test

The mobile implementation was tested on an iPhone 15 Pro using Safari.

The test sequence was:

Open NeuroViu Bridge while connected

Prepare Offline AI

Download and cache SmolLM2-135M-Instruct

Confirm Offline AI Ready

Enable Airplane Mode

Create a new patient encounter

Process the encounter locally

Review the generated draft

Approve and save the encounter locally

The complete workflow operated in Airplane Mode after the model had been prepared.

This demonstrates local inference on an accessible consumer mobile device without requiring a cloud AI request during inference.

Local Inference Verification

The mobile AI implementation uses:

@huggingface/transformers / Transformers.js

ONNX Runtime Web

WebAssembly

INT8 quantization

Web Worker execution

The mobile model weights are approximately 130.8 MiB, with the complete initial model download approximately 133 MiB.

Model assets are cached locally after preparation.

During testing, network monitoring showed no requests to Hugging Face during draft generation after the model was available locally.

When the application is offline, remote model loading is disabled.

Responsible AI

Human Approval Required

AI-generated information must be reviewed by the health worker.

Grounding Safeguard

Generated information is checked against patient-reported information before being presented as a reliable structured field.

Uncertainty

The system is designed to identify missing information rather than fabricate certainty.

Deterministic Safety Behaviors

Selected safety behaviors intentionally use explicit deterministic rules instead of delegating every safety decision to a generative model.

Graceful Fallback

If local model inference cannot run, the application can use its clearly labeled deterministic Basic Offline Processing Mode.

Non-Diagnostic Design

The system supports documentation and continuity of care. It does not perform diagnosis or treatment selection.

Languages

The current prototype supports:

English

French

French demonstrates localization for Francophone communities where connectivity and infrastructure constraints may affect access to digital health systems.

Localization in NeuroViu Bridge is intended to mean more than interface translation. It includes consideration of language, connectivity, device capability, trust, workflow, and human decision-making.

Local-First Records

Approved encounter records can be stored locally on the device.

When connectivity is unavailable, records can remain available locally and be marked:

Pending Sync

This demonstrates a store-and-forward architecture in which frontline documentation does not have to stop simply because network connectivity disappears.

Technology Stack

NeuroViu Bridge currently includes:

Progressive Web App architecture

TypeScript

Transformers.js

ONNX Runtime Web

WebAssembly mobile inference

Web Worker model execution

SmolLM2-135M-Instruct

Qwen2.5-0.5B-Instruct

INT8 mobile quantization

Quantized desktop deployment

WebGPU acceleration where supported

CPU fallback

Persistent browser storage

Offline caching

English/French localization

Human review workflow

Deterministic grounding safeguards

Deterministic safety rules

Basic offline fallback processing

What Is Real vs. Simulated

Transparency is important for this prototype.

Implemented

Mobile on-device language-model inference

SmolLM2-135M-Instruct mobile model

Quantized Qwen desktop architecture

Local model caching

Offline mobile inference after model preparation

English/French encounter workflow

Human review and approval

Grounding safeguard

Local encounter storage

Pending-sync state

Basic deterministic offline fallback

Device-aware AI architecture

Deterministic / Rule-Based

The following are intentionally rule-based:

Basic Offline Processing Mode

Danger-sign flagging

Grounding verification and fallback behavior

These components are not presented as generative AI.

Simulated

Server synchronization is simulated.

The current prototype uses a local delay to demonstrate a record moving from Pending Sync to Synced.

No production synchronization server is currently connected.

Interface Animation

The processing-step indicators shown during generation are interface feedback and should not be interpreted as four independently measured AI-processing stages.

Voice Input

Voice input uses the browser's Web Speech API where supported.

Voice functionality is therefore dependent on browser capabilities and should not be interpreted as guaranteed offline functionality.

On unsupported browsers or devices, users can enter patient information by typing.

Prototype Testing

Testing during development provided several useful findings.

Finding 1: Smaller Models Matter

The original Qwen-based approach was too resource-intensive for reliable mobile use.

The mobile architecture was therefore adapted to use SmolLM2-135M-Instruct INT8, reducing the model download to approximately 133 MiB.

This enabled successful local inference on the tested iPhone.

Finding 2: Grounding Matters

Generative output included unsupported information during testing.

The grounding safeguard rejected unsupported content rather than allowing it to silently enter the encounter record.

Finding 3: Device-Aware AI Matters

A model that is small enough for one computer may still be too large for a constrained mobile device.

NeuroViu Bridge therefore uses different local processing approaches based on device capability instead of requiring every user to have high-end hardware.

Current Limitations

NeuroViu Bridge is a hackathon prototype.

Current limitations include:

Initial model preparation requires connectivity.

Mobile model download is approximately 133 MiB.

Desktop model downloads are larger.

Performance varies by hardware and browser.

Cross-device offline reliability requires additional testing.

Android and other mobile/browser combinations have not yet been comprehensively tested.

Server synchronization is simulated.

Selected safety and fallback behaviors are deterministic.

Voice input depends on browser support.

The system has not undergone clinical validation.

The system is not a medical device.

The system is not intended for diagnosis or treatment.

Future Development

Potential next steps include:

Additional testing across low-cost Android devices

Further model-size reduction

Adaptive model selection based on device memory and compute capability

Improved French-language extraction

Additional local languages

Fully offline speech recognition

Secure encrypted synchronization

Production backend integration

Health-system interoperability

Frontline health-worker usability testing

Formal safety and performance evaluation

Evaluation on lower-cost and older hardware

Small AI Design Philosophy

NeuroViu Bridge began with the assumption that deploying a small generative model would be enough to make AI accessible at the edge.

Prototype testing demonstrated something more important:

The smallest generative model is not always the smallest useful AI system.

Useful Small AI requires adapting the model, runtime, fallback behavior, and workflow to the actual capabilities of the user's device.

For NeuroViu Bridge, that means:

Mobile device → smaller local model

Capable computer → larger local model

Model unavailable → deterministic offline processing

Every path → grounding + human review

The goal is not to maximize model size.

The goal is to preserve useful, responsible functionality under real-world constraints.

Design Principle

The AI assists. The human decides.

NeuroViu Bridge is designed around the idea that useful AI can support frontline healthcare without requiring constant connectivity, large cloud infrastructure, or autonomous clinical decision-making.

Built By

NeuroViu Labs

NeuroViu Bridge was developed as a Small AI prototype for frontline healthcare documentation and continuity of care.

Disclaimer

NeuroViu Bridge is a research and hackathon prototype.

It is not a diagnostic system, medical device, clinical decision-support system, or substitute for professional medical judgment.
