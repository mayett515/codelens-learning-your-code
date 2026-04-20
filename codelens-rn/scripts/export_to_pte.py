"""
ExecuTorch PTE Export Script for all-MiniLM-L6-v2
-------------------------------------------------
This script downloads the PyTorch version of all-MiniLM-L6-v2 from HuggingFace,
wraps it to handle mean-pooling and positional arguments, and exports it
to the ExecuTorch .pte format required by the React Native app.

Prerequisites (Run in a clean Python 3.10/3.11 environment):
  pip install torch --pre --index-url https://download.pytorch.org/whl/nightly/cpu
  pip install executorch
  pip install transformers
"""

from pathlib import Path

import torch
from transformers import AutoModel
from executorch.exir import to_edge


MAX_SEQUENCE_LENGTH = 512
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "assets" / "all-minilm-l6-v2.pte"


class EmbeddingModelWrapper(torch.nn.Module):
    def __init__(self):
        super().__init__()
        # Load the base transformer model
        self.model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        
    def forward(self, input_ids, attention_mask, token_type_ids):
        # The model expects keyword arguments, but torch.export requires positional args
        outputs = self.model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids
        )
        
        # Mean Pooling - Take attention mask into account for correct averaging
        token_embeddings = outputs.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        
        # Sum embeddings and divide by the number of actual tokens
        sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        
        return sum_embeddings / sum_mask

def main():
    print("Loading HuggingFace model...")
    model = EmbeddingModelWrapper()
    model.eval()

    # Bootstrap tensors for tracing/export; dynamic sequence axis is enabled below.
    print("Generating dummy inputs for tracing...")
    input_ids = torch.randint(0, 30522, (1, 16), dtype=torch.int64)
    attention_mask = torch.ones(1, 16, dtype=torch.int64)
    token_type_ids = torch.zeros(1, 16, dtype=torch.int64)

    batch_dim = torch.export.Dim("batch", min=1, max=1)
    seq_dim = torch.export.Dim("sequence", min=1, max=MAX_SEQUENCE_LENGTH)
    dynamic_shapes = (
        {0: batch_dim, 1: seq_dim},
        {0: batch_dim, 1: seq_dim},
        {0: batch_dim, 1: seq_dim},
    )

    # Step 1: Export to PyTorch 2.0 ExportedProgram
    print("Tracing model via torch.export...")
    exported_program = torch.export.export(
        model,
        (input_ids, attention_mask, token_type_ids),
        dynamic_shapes=dynamic_shapes,
    )

    # Step 2: Convert to ExecuTorch Edge dialect
    # Note: Depending on the backend (e.g., XNNPACK), delegation would happen here.
    # For this baseline, we are compiling for the standard CPU executor.
    print("Converting to ExecuTorch Edge dialect...")
    edge_program = to_edge(exported_program)

    # Step 3: Serialize and save
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"Saving to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "wb") as f:
        f.write(edge_program.to_executorch().buffer)

    print(f"Success! Model exported to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
