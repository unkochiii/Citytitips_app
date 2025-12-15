import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import StarRating from "react-native-star-rating-widget";

export default function Reviews({
  section,
  items,
  itemsToShow,
  showAll,
  setShowAll,
  showCommentForm,
  handleToggleCommentForm,
  handleSubmitComment,
  newComment,
  setNewComment,
  sendingComment,
  avatarFallback,
  formatDate,
  handleSeeMore,
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Reviews</Text>

        <View style={styles.plus3Points}>
          <TouchableOpacity onPress={() => handleToggleCommentForm(section)}>
            <FontAwesome6 name="add" size={18} />
          </TouchableOpacity>

          {items.length > 2 && (
            <TouchableOpacity
              onPress={() => handleSeeMore(setShowAll, showAll)}
            >
              <FontAwesome6
                name={showAll ? "minus" : "ellipsis"}
                size={18}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showCommentForm[section] && (
        <View style={styles.commentForm}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write your review..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            onPress={() => handleSubmitComment(section)}
            style={styles.commentButton}
            disabled={sendingComment}
          >
            <Text style={styles.commentButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      )}

      {itemsToShow.map((r) => (
        <View key={r._id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Image
              source={{
                uri: avatarFallback(
                  r.author.account.username,
                  r.author.account.avatar?.secure_url
                ),
              }}
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.username}>
                {r.author.account.username}
              </Text>
              <Text style={styles.date}>{formatDate(r.createdAt)}</Text>
            </View>
            <StarRating rating={r.rating} starSize={14} onChange={() => {}} />
          </View>
          <Text style={styles.content}>{r.content}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingTop: 10,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  plus3Points: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  /* ===== COMMENT FORM (Reviews only) ===== */

  commentForm: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 2,
  },

  commentInput: {
    height: 60,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    marginBottom: 6,
    fontSize: 13,
  },

  commentButton: {
    alignSelf: "flex-end",
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  commentButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },

  /* ===== CARD ===== */

  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 10,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  username: {
    fontWeight: "bold",
    fontSize: 14,
  },

  date: {
    fontSize: 11,
    color: "#777",
  },

  content: {
    fontSize: 13,
    color: "#333",
    lineHeight: 17,
  },
});

