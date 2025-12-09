import { View, Text } from "react-native";
import { Link } from "expo-router";
export default function Home() {
  return (
    <View>
      <Text>Accueil</Text>
      <Link href="/src/screens/BookScreen/BookScreen" asChild>
        <Text>Bookpage</Text>
      </Link>
      <Link href="/src/screens/Search/Search" asChild>
        <Text>Searchpage</Text>
      </Link>

    </View>
  );
}
