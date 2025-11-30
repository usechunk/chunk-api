# .chunk.json Specification

## Overview

The `.chunk.json` file is the manifest format used by Chunk to define modpack configurations. It serves as a universal specification that modpack creators can add to their repositories to make them compatible with the Chunk CLI.

## Format Version

Current specification version: **1.0.0**

## File Location

For GitHub-hosted modpacks, place `.chunk.json` in the repository root:
```
my-modpack/
├── .chunk.json
├── mods/
├── config/
└── README.md
```

For server installations, Chunk automatically creates `.chunk.json` in the server directory to track the installed modpack.

## Schema

### Basic Structure

```json
{
  "schema_version": "1.0.0",
  "name": "My Modpack",
  "version": "1.0.0",
  "mc_version": "1.20.1",
  "loader": "forge",
  "loader_version": "47.2.0",
  "java_version": 17,
  "recommended_ram_gb": 8,
  "mods": [],
  "optional": {}
}
```

### Required Fields

#### `schema_version` (string)
The version of the .chunk.json specification being used.

**Example:** `"1.0.0"`

---

#### `name` (string)
Human-readable name of the modpack.

**Example:** `"All The Mods 9"`

**Rules:**
- Max 100 characters
- Should be descriptive and unique

---

#### `version` (string)
Semantic version of the modpack.

**Example:** `"1.2.3"`

**Rules:**
- Must follow semver format (MAJOR.MINOR.PATCH)
- Used for upgrade detection

---

#### `mc_version` (string)
Minecraft version the modpack targets.

**Example:** `"1.20.1"`

**Rules:**
- Must be a valid Minecraft version
- Format: `"MAJOR.MINOR.PATCH"` (e.g., `"1.20.1"`)

---

#### `loader` (string)
Mod loader type.

**Valid values:**
- `"forge"`
- `"fabric"`
- `"neoforge"`

**Example:** `"forge"`

---

#### `loader_version` (string)
Version of the mod loader.

**Examples:**
- Forge: `"47.2.0"`
- Fabric: `"0.15.0"`
- NeoForge: `"20.5.14"`

**Rules:**
- Must be compatible with the specified `mc_version`
- Chunk validates compatibility automatically

---

### Optional Fields

#### `java_version` (integer)
Required Java version for this modpack.

**Example:** `17`

**Valid values:**
- `8` - Java 8
- `11` - Java 11
- `17` - Java 17
- `21` - Java 21

**Default:** Automatically determined from `mc_version`

---

#### `recommended_ram_gb` (integer)
Recommended server RAM in gigabytes.

**Example:** `8`

**Default:** `4`

**Rules:**
- Minimum: 2
- Used to generate start scripts with appropriate -Xmx settings

---

#### `description` (string)
Brief description of the modpack.

**Example:** `"A kitchen-sink modpack featuring tech, magic, and exploration mods"`

---

#### `author` (string)
Modpack creator or team name.

**Example:** `"ATM Team"`

---

#### `homepage` (string)
URL to modpack homepage or documentation.

**Example:** `"https://www.curseforge.com/minecraft/modpacks/all-the-mods-9"`

---

### Mod Definitions

#### `mods` (array)
List of server-side mods included in the modpack.

Each mod object contains:

```json
{
  "id": "jei",
  "name": "Just Enough Items",
  "version": "15.2.0.27",
  "url": "https://modrinth.com/mod/jei",
  "side": "both",
  "required": true,
  "filename": "jei-1.20.1-forge-15.2.0.27.jar"
}
```

##### Mod Object Fields

**`id` (string, required)**
Unique identifier for the mod.

**`name` (string, required)**
Human-readable mod name.

**`version` (string, required)**
Mod version.

**`url` (string, optional)**
Download URL or project page for the mod.

**`side` (string, optional)**
Which side the mod runs on.
- `"client"` - Client-only (excluded from server)
- `"server"` - Server-only
- `"both"` - Both sides (default)

**`required` (boolean, optional)**
Whether the mod is required or optional.
- Default: `true`

**`filename` (string, optional)**
Expected filename of the mod JAR.
- Used for validation and identification

---

### Optional Configuration

#### `optional` (object)
Additional configuration options.

```json
{
  "optional": {
    "server_properties": {
      "max-players": 20,
      "view-distance": 10,
      "difficulty": "normal"
    },
    "jvm_args": [
      "-XX:+UseG1GC",
      "-XX:+ParallelRefProcEnabled"
    ],
    "world_type": "default",
    "level_seed": "",
    "generate_structures": true
  }
}
```

##### `server_properties` (object)
Key-value pairs to include in server.properties.

**Common properties:**
```json
{
  "max-players": 20,
  "view-distance": 10,
  "simulation-distance": 10,
  "difficulty": "normal",
  "gamemode": "survival",
  "pvp": true,
  "spawn-protection": 16,
  "motd": "A Chunk-managed server"
}
```

##### `jvm_args` (array of strings)
Additional JVM arguments for server startup.

**Example:**
```json
[
  "-XX:+UseG1GC",
  "-XX:+ParallelRefProcEnabled",
  "-XX:MaxGCPauseMillis=200",
  "-XX:+UnlockExperimentalVMOptions",
  "-XX:+DisableExplicitGC"
]
```

##### `world_type` (string)
World type for generation.

**Valid values:**
- `"default"`
- `"flat"`
- `"amplified"`
- `"large_biomes"`

##### `level_seed` (string)
World seed (empty for random).

##### `generate_structures` (boolean)
Whether to generate structures (villages, temples, etc.).

---

## Complete Example

```json
{
  "schema_version": "1.0.0",
  "name": "My Custom Modpack",
  "version": "1.0.0",
  "description": "A curated selection of tech and magic mods",
  "author": "MyUsername",
  "homepage": "https://github.com/myusername/my-modpack",
  
  "mc_version": "1.20.1",
  "loader": "forge",
  "loader_version": "47.2.0",
  "java_version": 17,
  "recommended_ram_gb": 8,
  
  "mods": [
    {
      "id": "jei",
      "name": "Just Enough Items",
      "version": "15.2.0.27",
      "url": "https://modrinth.com/mod/jei",
      "side": "both",
      "required": true,
      "filename": "jei-1.20.1-forge-15.2.0.27.jar"
    },
    {
      "id": "ftb-chunks",
      "name": "FTB Chunks",
      "version": "2001.2.3",
      "url": "https://www.curseforge.com/minecraft/mc-mods/ftb-chunks",
      "side": "both",
      "required": true,
      "filename": "ftbchunks-forge-2001.2.3.jar"
    },
    {
      "id": "journeymap",
      "name": "JourneyMap",
      "version": "5.9.18",
      "url": "https://www.curseforge.com/minecraft/mc-mods/journeymap",
      "side": "client",
      "required": false,
      "filename": "journeymap-1.20.1-5.9.18-forge.jar"
    }
  ],
  
  "optional": {
    "server_properties": {
      "max-players": 20,
      "view-distance": 12,
      "simulation-distance": 10,
      "difficulty": "normal",
      "gamemode": "survival",
      "pvp": true,
      "spawn-protection": 16,
      "motd": "My Custom Modpack Server"
    },
    "jvm_args": [
      "-XX:+UseG1GC",
      "-XX:+ParallelRefProcEnabled",
      "-XX:MaxGCPauseMillis=200"
    ],
    "world_type": "default",
    "generate_structures": true
  }
}
```

---

## Validation

Chunk automatically validates `.chunk.json` files and provides helpful error messages:

```bash
# Validate a .chunk.json file
chunk validate ./.chunk.json

# Auto-fix common issues
chunk validate ./.chunk.json --fix
```

### Common Validation Errors

**Invalid schema version:**
```
Error: Unsupported schema_version "2.0.0"
Fix: Use schema_version "1.0.0"
```

**Missing required field:**
```
Error: Missing required field "mc_version"
Fix: Add "mc_version": "1.20.1" to your .chunk.json
```

**Invalid loader:**
```
Error: Invalid loader "fabric-quilt"
Fix: Use one of: forge, fabric, neoforge
```

**Incompatible versions:**
```
Error: Forge 47.2.0 is not compatible with Minecraft 1.19.2
Fix: Use Forge 43.2.0 or newer for 1.19.2
```

---

## Usage Patterns

### For Modpack Creators

1. Create `.chunk.json` in your repository root
2. Define your modpack configuration
3. Users can install with: `chunk install username/repo`

### For Server Admins

`.chunk.json` is automatically created when you install a modpack:

```bash
chunk install atm9 --dir ./my-server
# Creates ./my-server/.chunk.json
```

This tracks the installation and enables:
- Version upgrades: `chunk upgrade atm9`
- Diff checking: `chunk diff atm9`
- Automated backups before changes

### For Local Modpacks

Convert an existing modpack to use Chunk:

1. Create `.chunk.json` in your modpack directory
2. Install: `chunk install ./path/to/modpack`

---

## Migration from Other Formats

### From Modrinth (.mrpack)

Chunk automatically converts Modrinth packs to `.chunk.json`:

```bash
chunk install mypack.mrpack
# Generates .chunk.json from modrinth.index.json
```

### From CurseForge

Support planned for future release.

---

## Best Practices

1. **Use semantic versioning** - Increment version numbers appropriately:
   - MAJOR: Breaking changes (mod loader change, MC version change)
   - MINOR: New mods, major updates
   - PATCH: Bug fixes, minor mod updates

2. **Specify exact versions** - Don't use version ranges or "latest"

3. **Mark client-only mods** - Use `"side": "client"` to prevent server installation

4. **Document changes** - Include a CHANGELOG.md with your modpack

5. **Test installations** - Run `chunk install` on a clean directory before release

6. **Keep loader versions up to date** - Use stable, tested loader versions

---

## Schema Evolution

Future schema versions will maintain backward compatibility. When new features are added, the schema_version will increment:

- `1.x.x` - Current stable
- `2.x.x` - Future major changes (will support 1.x.x files)

Chunk always supports older schema versions.

---

## Support

For questions or issues with .chunk.json:

- Documentation: https://docs.chunkhub.io
- GitHub Issues: https://github.com/alexinslc/chunk/issues
- Discord: https://discord.gg/chunk
