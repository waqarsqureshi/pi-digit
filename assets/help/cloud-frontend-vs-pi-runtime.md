# Cloud Frontend vs Raspberry Pi Runtime

This project supports two common deployment modes.

## Mode A: Cloud-hosted frontend (marketing/demo)

Use this when hosting landing pages and docs on cloud infrastructure.

### Typical setup

- Set environment variable: `CLOUD_NO_PYTHON=1`
- Run Node server normally

### What works

- Landing page (`/`)
- Wiki (`/wiki`, `/wiki.html`)
- Emulator UI shell (`/emulator/`) in simulation-compatible mode

### What is intentionally disabled

- Python-backed hardware daemon
- Python camera daemon
- Python code execution against local host runtime
- Pi-specific diagnostics that require Pi hardware + Python libs

## Mode B: Raspberry Pi full runtime (lab/production)

Use this for real hardware execution and complete feature support.

### Requirements

- Raspberry Pi OS
- Python runtime and Pi hardware packages
- Sense HAT / GPIO / I2C access as needed

### What works

- Full Python and C workflow in Code Studio
- Hardware diagnostics and live board integration
- Optional camera and sensor pipelines

## Recommendation

- Use **cloud mode** for public-facing documentation, onboarding, and lightweight demos.
- Use **Raspberry Pi mode** for teaching labs, physical computing, and hardware validation.
