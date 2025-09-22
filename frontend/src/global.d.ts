// global.d.ts
import "react-native";

declare module "react-native" {
  interface ViewStyle {
    cursor?: "auto" | "default" | "pointer" | "grab" | "grabbing" | string;
  }
}
