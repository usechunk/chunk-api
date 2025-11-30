package commands

import (
	"fmt"

	"github.com/spf13/cobra"
)

var SearchCmd = &cobra.Command{
	Use:   "search <query>",
	Short: "Search for modpacks",
	Long: `Search for modpacks across all available sources.

Searches:
  - ChunkHub registry
  - Modrinth modpacks
  - GitHub repositories (if configured)

Examples:
  chunk search "all the mods"
  chunk search atm
  chunk search fabric`,
	Args: cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		query := args[0]
		fmt.Printf("Searching for: %s\n", query)
		fmt.Println()
		fmt.Println("⚠️  Search functionality not yet implemented")
		fmt.Println()
		fmt.Println("Results will include:")
		fmt.Println("  - Modpack name")
		fmt.Println("  - Description")
		fmt.Println("  - Minecraft version")
		fmt.Println("  - Mod loader")
		fmt.Println("  - Source (ChunkHub/Modrinth/GitHub)")
	},
}
