package commands

import (
	"fmt"

	"github.com/spf13/cobra"
)

var (
	installDir string
)

var InstallCmd = &cobra.Command{
	Use:   "install <modpack>",
	Short: "Install a modpack server",
	Long: `Install a modpack server from various sources.

Sources:
  - ChunkHub registry: chunk install atm9
  - GitHub repository: chunk install alexinslc/my-cool-mod
  - Modrinth: chunk install modrinth:<slug>
  - Local file: chunk install ./modpack.mrpack

The command will:
  - Download the modpack
  - Install the correct mod loader (Forge/Fabric/NeoForge)
  - Download all server-side mods
  - Generate server configurations
  - Create start scripts`,
	Args: cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		modpack := args[0]
		fmt.Printf("Installing modpack: %s\n", modpack)
		
		if installDir != "" {
			fmt.Printf("Installation directory: %s\n", installDir)
		} else {
			fmt.Printf("Installation directory: ./server\n")
		}
		
		fmt.Println("⚠️  Install functionality not yet implemented")
	},
}

func init() {
	InstallCmd.Flags().StringVarP(&installDir, "dir", "d", "", "Installation directory (default: ./server)")
}
