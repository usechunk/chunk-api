# Chunk CLI Documentation

## Overview

Chunk is a universal CLI tool for deploying and managing modded Minecraft servers. It makes deploying modpack servers as simple as running a single command.

## Quick Start

```bash
# Search for modpacks
chunk search

# Install a modpack from ChunkHub
chunk install atm9

# Install from GitHub (shorthand)
chunk install alexinslc/my-cool-mod

# Install from local file
chunk install ./mymodpack.mrpack

# Upgrade an existing installation
chunk upgrade vault-hunters

# Compare versions
chunk diff ./old-server ./new-modpack
```

## Installation

### macOS/Linux
```bash
curl -sSL https://chunkhub.io/install.sh | bash
```

### Windows
```powershell
irm https://chunkhub.io/install.ps1 | iex
```

### From Source
```bash
git clone https://github.com/alexinslc/chunk
cd chunk
make install
```

## Commands

### `chunk install <modpack>`

Install a modpack server to the current directory or specified location.

**Arguments:**
- `modpack` - Modpack identifier (ChunkHub slug, GitHub repo, or local file)

**Flags:**
- `--dir <path>` - Installation directory (default: current directory)
- `--skip-java-check` - Skip Java version validation

**Examples:**
```bash
# Install from ChunkHub
chunk install atm9 --dir /opt/minecraft

# Install from GitHub
chunk install alexinslc/my-modpack

# Install from local file
chunk install ./modpack.mrpack
```

### `chunk search [query]`

Search for modpacks in the ChunkHub registry.

**Examples:**
```bash
chunk search
chunk search "all the mods"
```

### `chunk upgrade <modpack>`

Upgrade an existing server installation to a new version while preserving world data and configurations.

**Arguments:**
- `modpack` - New modpack version or source

**Flags:**
- `--dir <path>` - Server directory to upgrade
- `--no-backup` - Skip backup creation (not recommended)

**Examples:**
```bash
chunk upgrade atm9 --dir /opt/minecraft
```

### `chunk diff <old> <new>`

Compare two modpack versions and show differences.

**Arguments:**
- `old` - Current modpack or server directory
- `new` - New modpack to compare against

**Examples:**
```bash
chunk diff ./my-server atm9:latest
```

## Configuration

Chunk uses a `.chunk.json` manifest file for modpack specifications:

```json
{
  "name": "My Modpack",
  "version": "1.0.0",
  "mc_version": "1.20.1",
  "loader": "forge",
  "loader_version": "47.2.0",
  "java_version": 17,
  "recommended_ram_gb": 8,
  "mods": [
    {
      "id": "jei",
      "name": "Just Enough Items",
      "version": "15.2.0",
      "url": "https://modrinth.com/mod/jei"
    }
  ]
}
```

## Java Requirements

Chunk automatically detects Java installations and validates compatibility:

| Minecraft Version | Required Java |
|------------------|---------------|
| 1.21+            | Java 21+      |
| 1.20.5+          | Java 21+      |
| 1.20.x           | Java 17+      |
| 1.18-1.19        | Java 17+      |
| 1.16-1.17        | Java 8+       |

If Java is not installed or incompatible, Chunk provides installation instructions.

## Data Preservation

When upgrading servers, Chunk automatically preserves:
- World data (overworld, nether, end)
- Server configuration (server.properties)
- Player data (whitelist, ops, bans)
- Custom configurations

A backup is created before upgrades and can be restored if issues occur.

## Troubleshooting

### Java Not Found
```bash
# Check Java installation
java -version

# Chunk will guide you through installation if needed
chunk install <modpack>
```

### Permission Denied
```bash
# Make start script executable
chmod +x start.sh

# Or use auto-fix
chunk validate --fix
```

### Mod Compatibility Issues
```bash
# Check differences between versions
chunk diff old-version new-version

# Review breaking changes before upgrading
```

## Support

- Documentation: https://docs.chunkhub.io
- Issues: https://github.com/alexinslc/chunk/issues
- Discord: https://discord.gg/chunk

## License

MIT License - see LICENSE.md for details
