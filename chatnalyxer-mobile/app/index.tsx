import { Redirect } from "expo-router";

export default function Index() {
  // when someone visits "/", send them to the login screen
  return <Redirect href="/login" />;
}
