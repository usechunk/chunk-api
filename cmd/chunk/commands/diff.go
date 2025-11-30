package commands

import (
	"fmt"

	"github.com/spf13/cobra"
)

var DiffCmd = &cobra.Command{
	Use:   "diff <modpack>",
	Short: "Show differences between modpack versions",
	Long: `Display differences between the current installed version and the latest version.

Shows:
  - Minecraft version changes
  - Mod loader version changes (Forge/Fabric/NeoForge)
  - Added mods
  - Removed mods
  - Updated mods
  - Configuration changes

Examples:
  chunk diff atm9
  chunk diff alexinslc/my-cool-mod`,
	Args: cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		modpack := args[0]
		fmt.Printf("Checking differences for: %s\n", modpack)
		fmt.Println()
		fmt.Println("⚠️  Diff functionality not yet implemented")
		fmt.Println()
		fmt.Println("Diff output will show:")
		fmt.Println("  - Minecraft version: 1.20.1 → 1.20.2")
		fmt.Println("  - Mod loader: Forge 47.1.0 → 47.2.0")
		fmt.Println("  + Added mods (green)")
		fmt.Println("  - Removed mods (red)")
		fmt.Println("  ~ Updated mods (yellow)")
	},
}
