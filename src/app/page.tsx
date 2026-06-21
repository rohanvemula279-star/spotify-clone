import { redirect } from "next/navigation";

// The Viper UI is the app's real home. The legacy recommendation home now
// lives only as components; everything routes through /viper.
export default function RootPage() {
  redirect("/viper");
}
