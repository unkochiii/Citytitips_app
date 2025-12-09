import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import axios from "axios";
import { useState, useEffect } from "react";
import StarRating from "react-native-star-rating-widget";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import OrderSubjects from "../../components/OrderSubjects";

export default function BookScreen() {
  const [bookData, setBookData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(4.5);

  const id = "OL29226517W";

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await axios.get(
          `https://openlibrary.org/works/OL29226517W.json`
          //chemin avec /books
        );
        const work = response.data;

        // thèmes

        const themes = OrderSubjects(work.subjects);
        console.log(themes);

        let coverUrl = null;
        if (work.covers && work.covers.length > 0) {
          coverUrl = `https://covers.openlibrary.org/b/id/${work.covers[0]}-L.jpg`;
        }

        // auteurs
        let authors = [];
        if (work.authors && work.authors.length > 0) {
          for (let a of work.authors) {
            const authorKey = a.author.key;
            const authorResponse = await axios.get(
              `https://openlibrary.org${authorKey}.json`
            );
            authors.push(authorResponse.data.name);
          }
        }

        const title = work.title;
        const description =
          work.description?.value ||
          work.description ||
          "No description available.";

        setBookData({ title, coverUrl, description, authors, themes });
        setIsLoading(false);
      } catch (error) {
        console.log("Error fetching book data:", error);
      }
    };

    fetchBook();
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      <View style={styles.container}>
        <View style={styles.livresque}>
          <SimpleLineIcons name="book-open" size={30} color="black" />
        </View>
        {bookData.coverUrl && (
          <View style={{ marginBottom: 20, alignItems: "center" }}>
            {/* Halo derrière le livre */}
            <View
              style={{
                position: "absolute",
                width: 220,
                height: 320,
                backgroundColor: "#4A281B",
                borderRadius: 12,
                opacity: 0.5,
                shadowColor: "#4A281B",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 25,
                elevation: 15,
              }}
            />
            {/* Couverture du livre */}
            <Image
              source={{ uri: bookData.coverUrl }}
              style={styles.book_picture}
            />
          </View>
        )}

        <Text style={styles.title}>{bookData.title}</Text>
        <Text style={styles.author}>{`by ${bookData.authors.join(", ")}`}</Text>

        <View style={styles.add}>
          <Entypo name="add-to-list" size={22} color="black" />
          <FontAwesome name="heart" size={22} color="black" />
          <FontAwesome name="share" size={22} color="black" />
        </View>

        <View style={styles.rate}>
          <StarRating
            rating={rating}
            onChange={setRating}
            maxStars={5}
            enableHalfStar={true}
            style={styles.stars}
            starSize={20}
          />
          <Text>{rating}</Text>
        </View>
        <View style={styles.themes}>
          {bookData.themes.map((theme, index) => {
            return (
              <Text
                key={index}
                style={{ ...styles.themeBadge, backgroundColor: theme.color }}
              >
                {theme.name}
              </Text>
            );
          })}
        </View>
        <Text style={styles.description}>{bookData.description}</Text>
        <Text
          style={{
            borderBottomColor: "black",
            borderBottomWidth: 2,
            width: "100%",
            borderTopColor: "black",
            borderTopWidth: 2,
            marginTop: 50,
          }}
        >
          Reviews
        </Text>
        <Text style={styles.categories}>Memes</Text>
        <Text style={styles.categories}>Extracts</Text>
        <Text style={styles.categories}>Let's predict what happens next</Text>
        <Text style={styles.categories}>Fan arts</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 10,
    backgroundColor: "#FAFAF0",
  },
  livresque: {
    marginVertical: 10,
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  book_picture: {
    width: 200,
    height: 300,
    marginBottom: 20,
    borderRadius: 10,
  },
  title: {
    fontSize: 20,
    textDecorationLine: "underline",
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  add: { flexDirection: "row", marginVertical: 5, gap: 100 },
  rate: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  stars: { size: 5 },
  author: { fontSize: 11, color: "black", paddingVertical: 5 },
  description: {
    fontSize: 12,
    textAlign: "center",
  },
  themes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 5,
    justifyContent: "center",
  },
  themeBadge: {
    paddingHorizontal: 12,
    fontSize: 12,
    paddingVertical: 6,
    borderRadius: 16,
    color: "white",
    fontWeight: "bold",
    margin: 2,
    overflow: "hidden",
  },
  categories: {
    borderBottomColor: "black",
    borderBottomWidth: 2,
    width: "100%",
  },
});
