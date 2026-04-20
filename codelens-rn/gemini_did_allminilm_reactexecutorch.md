# Gemini's ExecuTorch All-MiniLM Setup Log

### What was done:
1. **Installed `react-native-executorch`**: The official library to run on-device AI.
2. **Downloaded `all-minilm-l6-v2.onnx`**: Placed the 23MB raw model into `assets/all-minilm-l6-v2.onnx` (used initially as a placeholder).
3. **Implemented Pure JS Tokenizer (WordPiece)**:
   - Downloaded the official 30,000-word `vocab.txt` from HuggingFace.
   - Converted the text file into a highly efficient `src/ai/vocab.json` dictionary.
   - Built `src/ai/tokenizer.ts`: A lightning-fast, zero-dependency WordPiece tokenizer that converts text directly into `input_ids` that the model understands, entirely avoiding native C++ or WASM WebView overhead.
4. **Created `.pte` Python Export Script**: 
   - Wrote `scripts/export_to_pte.py`, which downloads the `all-MiniLM-L6-v2` PyTorch model from HuggingFace, wraps it to apply mean-pooling correctly, and traces/exports it to the native `.pte` ExecuTorch format required by the phone.
5. **Created `src/adapters/local-embedder.ts`**: A wrapper to load the local model. It tokenizes the text and formats the tensors (`input_ids`, `attention_mask`, `token_type_ids`) before execution. It has been updated to expect the compiled `assets/all-minilm-l6-v2.pte` file instead of the raw `.onnx`.
6. **Updated `src/composition.ts`**: Swapped out the old remote cloud embedding (SiliconFlow/OpenRouter) to exclusively use the new `getLocalEmbedding()` function.
7. **Wrote Unit Tests**: Added a mocked Vitest file `src/adapters/__tests__/local-embedder.test.ts` to ensure the structure executes cleanly without native crash loops in Node.

### The "Reality Check" (Crucial Details to Note):
The app architecture is fully ready to use local on-device embeddings, and the C++ overhead has been avoided on the JavaScript side thanks to the Pure JS Tokenizer. 

**However, before you build the app for Android/iOS, you MUST generate the `.pte` file:**
1. Open a terminal and create a clean Python 3.10+ environment.
2. Install the ExecuTorch prerequisites (see the docstring inside `scripts/export_to_pte.py`).
3. Run the script: `python scripts/export_to_pte.py`.
4. This will generate `assets/all-minilm-l6-v2.pte`. 

Once that file exists, your React Native build will bundle it correctly and your app will run completely free and offline.