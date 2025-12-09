import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
} from "react-native";
import axios from "axios";
import { useState, useEffect } from "react";

export default function Search() {
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [data, setData] = useState("");

  useEffect(() => {
    if (search.trim() === "") {
      setData(null); //erase old results
      setIsLoading(false);
      return;
    } //Do nothing if search input is empty

    const fetchData = async () => {

      try {
        const response = await axios.get(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(search)}` //avoid forbiddens characters
        );
        setData(response.data);
        console.log(response.data);
      } catch (error) {
        console.log(error.message);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [search]);

//   if (isLoading) {
//     return (
//       <View style={styles.container}>
//         <Text>Loading...</Text>
//       </View>
//     );
//   }

  return (
    <ScrollView>
      <TextInput
        value={search}
        onChangeText={(text) => setSearch(text)}
        placeholder="books,ISBN,author ..."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 10,
    backgroundColor: "#FAFAF0",
  },
});
