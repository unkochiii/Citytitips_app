// app/post/[id].js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { FontAwesome, Ionicons } from "@expo/vector-icons";

export default function PostDetail() {
  const { id } = useLocalSearchParams(); // ✅ Récupère l'id depuis l'URL
  const router = useRouter();
  const { token, user } = useAuth();

  const userId = user?._id || user?.id;
  const isAdmin = user?.role === "admin";

  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // States pour les commentaires
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState(null);

  // Récupérer le post
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${id}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        setPost(response.data);

        if (response.data.comments && Array.isArray(response.data.comments)) {
          setComments(response.data.comments);
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Erreur lors du chargement");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id, token]);

  // Récupérer les commentaires
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await axios.get(
          `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${id}/comments`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        if (Array.isArray(response.data)) {
          setComments(response.data);
        } else if (response.data?.comments) {
          setComments(response.data.comments);
        } else {
          setComments([]);
        }
      } catch (err) {
        console.error("Erreur chargement commentaires:", err);
        setComments([]);
      }
    };

    if (id) {
      fetchComments();
    }
  }, [id, token]);

  // ✅ Fonction pour afficher les étoiles
  const renderStars = (note) => {
    const maxStars = 5;
    const rating = Math.min(Math.max(0, note || 0), maxStars);
    const stars = [];

    for (let i = 1; i <= maxStars; i++) {
      stars.push(
        <FontAwesome
          key={i}
          name={i <= rating ? "star" : "star-o"}
          size={18}
          color="#eca305"
          style={{ marginRight: 2 }}
        />
      );
    }

    return <View style={styles.starsContainer}>{stars}</View>;
  };

  // ✅ Couleur selon le type
  const getTypeColor = (type) => {
    switch (type) {
      case "event":
        return "#ffdd11";
      case "recommandation":
        return "#eca305";
      case "vente":
        return "#0d7dca";
      case "question":
        return "#142247";
      default:
        return "#999";
    }
  };

  // Gérer le like
  const handleLike = async () => {
    if (!token) {
      router.push("/(auth)/login");
      return;
    }

    try {
      const response = await axios.post(
        `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${id}/toggle-like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPost((prev) => ({
        ...prev,
        likesCount: response.data.likesCount,
        hasLiked: response.data.hasLiked,
      }));
    } catch (err) {
      console.error("Erreur like:", err);
    }
  };

  // Poster un commentaire
  const handleSubmitComment = async () => {
    if (!token) {
      router.push("/(auth)/login");
      return;
    }

    if (!commentText.trim()) {
      setCommentError("Le commentaire ne peut pas être vide");
      return;
    }

    try {
      setIsSubmitting(true);
      setCommentError(null);

      const response = await axios.post(
        `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${id}/comment`,
        { content: commentText },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newComment = response.data?.comment || response.data;

      setComments((prev) => [newComment, ...prev]);
      setPost((prev) => ({
        ...prev,
        commentsCount: (prev.commentsCount || 0) + 1,
      }));
      setCommentText("");
    } catch (err) {
      console.error("Erreur commentaire:", err);
      setCommentError(
        err.response?.data?.message || "Erreur lors de l'envoi du commentaire"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Supprimer un commentaire
  const handleDeleteComment = (commentId, isCommentAuthor) => {
    const confirmMessage = isCommentAuthor
      ? "Voulez-vous vraiment supprimer ce commentaire ?"
      : "Voulez-vous vraiment supprimer ce commentaire (Admin) ?";

    Alert.alert("Confirmation", confirmMessage, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            const url = isCommentAuthor
              ? `https://api--tanjablabla--t4nqvl4d28d8.code.run/comment/${commentId}`
              : `https://api--tanjablabla--t4nqvl4d28d8.code.run/admin/comment/${commentId}`;

            await axios.delete(url, {
              headers: { Authorization: `Bearer ${token}` },
            });

            setComments((prev) =>
              prev.filter(
                (comment) => (comment._id || comment.id) !== commentId
              )
            );

            setPost((prev) => ({
              ...prev,
              commentsCount: Math.max((prev.commentsCount || 1) - 1, 0),
            }));
          } catch (err) {
            console.error("Erreur suppression commentaire:", err);
            Alert.alert(
              "Erreur",
              err.response?.data?.message || "Erreur lors de la suppression"
            );
          }
        },
      },
    ]);
  };

  // ✅ Supprimer le post (admin)
  const handleDeletePost = () => {
    Alert.alert(
      "Confirmation",
      "Voulez-vous vraiment supprimer cette publication ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(
                `https://api--tanjablabla--t4nqvl4d28d8.code.run/admin/post/${id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              router.back();
            } catch (err) {
              console.error("Erreur suppression post:", err);
              Alert.alert(
                "Erreur",
                err.response?.data?.message || "Erreur lors de la suppression"
              );
            }
          },
        },
      ]
    );
  };

  // ✅ Loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Chargement...</Text>
      </View>
    );
  }

  // ✅ Erreur
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#007bff" />
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ Post non trouvé
  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="help-circle" size={50} color="#999" />
        <Text style={styles.errorText}>Post non trouvé</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#007bff" />
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const safeComments = Array.isArray(comments) ? comments : [];
  const isApproved = post.status === "approved";
  const isPending = post.status === "pending";
  const isRejected = post.status === "rejected";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ✅ Header avec bouton retour */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007bff" />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity onPress={handleDeletePost}>
              <FontAwesome name="trash-o" size={24} color="#e74c3c" />
            </TouchableOpacity>
          )}
        </View>

        {/* ✅ Article */}
        <View style={styles.article}>
          {/* Type et statut */}
          <View style={styles.sousHeader}>
            <View style={styles.sousHeaderLeft}>
              <View
                style={[
                  styles.light,
                  { backgroundColor: getTypeColor(post.type) },
                ]}
              />
              <Text style={styles.postType}>{post.type}</Text>
            </View>

            {!isApproved && (
              <View
                style={[
                  styles.statusBadge,
                  isPending && styles.statusPending,
                  isRejected && styles.statusRejected,
                ]}
              >
                <Text style={styles.statusText}>
                  {isPending ? "En attente" : "Rejeté"}
                </Text>
              </View>
            )}
          </View>

          {/* Auteur */}
          <View style={styles.avatar}>
            {post.authorId?.account?.avatar?.secure_url ? (
              <Image
                source={{ uri: post.authorId.account.avatar.secure_url }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {post.authorId?.account?.username?.charAt(0).toUpperCase() ||
                    "?"}
                </Text>
              </View>
            )}
            <View style={styles.avatarInfo}>
              <Text style={styles.username}>
                {post.authorId?.account?.username || "Anonyme"}
              </Text>
              <Text style={styles.dateText}>
                Publié le {new Date(post.createdAt).toLocaleDateString("fr-FR")}
              </Text>
            </View>
          </View>

          {/* Contenu */}
          <Text style={styles.titre}>{post.titre}</Text>
          {post.description && (
            <Text style={styles.description}>{post.description}</Text>
          )}
          {post.content && <Text style={styles.content}>{post.content}</Text>}

          {/* ✅ Infos EVENT */}
          {post.type === "event" && (
            <View style={styles.eventInfo}>
              {post.lieu && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={16} color="#666" />
                  <Text style={styles.infoText}>{post.lieu}</Text>
                </View>
              )}
              {post.dateEvent && (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={16} color="#666" />
                  <Text style={styles.infoText}>
                    {new Date(post.dateEvent).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              )}
              {post.nbParticipants && (
                <View style={styles.infoRow}>
                  <Ionicons name="people" size={16} color="#666" />
                  <Text style={styles.infoText}>
                    {post.nbParticipants} participants max
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ✅ Infos RECOMMANDATION */}
          {post.type === "recommandation" && (
            <View style={styles.recoInfo}>
              {(post.note || post.nbStar) && (
                <View style={styles.noteContainer}>
                  {renderStars(post.note || post.nbStar)}
                  <Text style={styles.noteValue}>
                    ({post.note || post.nbStar}/5)
                  </Text>
                </View>
              )}
              {post.lieu && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={16} color="#666" />
                  <Text style={styles.infoText}>{post.lieu}</Text>
                </View>
              )}
            </View>
          )}

          {/* ✅ Images */}
          {post.images && post.images.length > 0 && (
            <View style={styles.imagesContainer}>
              {post.images.map((image, index) => (
                <Image
                  key={image.public_id || index}
                  source={{ uri: image.url }}
                  style={[
                    styles.postImage,
                    post.images.length === 1 && styles.singleImage,
                  ]}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}

          {/* ✅ Interactions */}
          {isApproved && (
            <View style={styles.interaction}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                <FontAwesome
                  name={post.hasLiked ? "heart" : "heart-o"}
                  size={20}
                  color={post.hasLiked ? "#e74c3c" : "#666"}
                />
                <Text style={styles.number}>{post.likesCount || 0}</Text>
              </TouchableOpacity>

              <View style={styles.actionBtn}>
                <FontAwesome name="comment-o" size={20} color="#666" />
                <Text style={styles.number}>{post.commentsCount || 0}</Text>
              </View>
            </View>
          )}

          {/* ✅ Message si en attente ou rejeté */}
          {isPending && (
            <View style={styles.pendingContainer}>
              <Ionicons name="time" size={20} color="#856404" />
              <Text style={styles.pendingText}>En attente de validation</Text>
            </View>
          )}

          {isRejected && post.rejectionReason && (
            <View style={styles.rejectedContainer}>
              <Ionicons name="close-circle" size={20} color="#721c24" />
              <Text style={styles.rejectedText}>
                Raison du rejet : {post.rejectionReason}
              </Text>
            </View>
          )}
        </View>

        {/* ✅ Section commentaires */}
        {isApproved && (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Commentaires ({safeComments.length})
            </Text>

            {/* Formulaire de commentaire */}
            {token ? (
              <View style={styles.commentForm}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Écrire un commentaire..."
                  placeholderTextColor="#999"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  editable={!isSubmitting}
                />
                {commentError && (
                  <Text style={styles.commentError}>{commentError}</Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (!commentText.trim() || isSubmitting) &&
                      styles.sendBtnDisabled,
                  ]}
                  onPress={handleSubmitComment}
                  disabled={isSubmitting || !commentText.trim()}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.sendBtnText}>Envoyer</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.loginPrompt}
                onPress={() => router.push("/(auth)/login")}
              >
                <Text style={styles.loginPromptText}>
                  Connectez-vous pour commenter
                </Text>
              </TouchableOpacity>
            )}

            {/* Liste des commentaires */}
            {safeComments.length === 0 ? (
              <Text style={styles.noComments}>
                Aucun commentaire pour le moment
              </Text>
            ) : (
              safeComments.map((comment) => {
                const commentId = comment._id || comment.id;
                const isCommentAuthor =
                  userId &&
                  (comment.authorId?._id === userId ||
                    comment.authorId === userId);
                const canDelete = isCommentAuthor || isAdmin;

                return (
                  <View
                    key={commentId || Math.random()}
                    style={styles.commentItem}
                  >
                    <View style={styles.commentHeader}>
                      {comment.authorId?.account?.avatar?.secure_url ? (
                        <Image
                          source={{
                            uri: comment.authorId.account.avatar.secure_url,
                          }}
                          style={styles.commentAvatar}
                        />
                      ) : (
                        <View style={styles.commentAvatarPlaceholder}>
                          <Text style={styles.commentAvatarText}>
                            {comment.authorId?.account?.username?.charAt(0) ||
                              "?"}
                          </Text>
                        </View>
                      )}

                      <View style={styles.commentMeta}>
                        <Text style={styles.commentAuthor}>
                          {comment.authorId?.account?.username || "Anonyme"}
                        </Text>
                        <Text style={styles.commentContent}>
                          {comment.content}
                        </Text>
                        <Text style={styles.commentDate}>
                          {comment.createdAt
                            ? new Date(comment.createdAt).toLocaleDateString(
                                "fr-FR"
                              )
                            : "À l'instant"}
                        </Text>
                      </View>

                      {canDelete && (
                        <TouchableOpacity
                          style={styles.deleteCommentBtn}
                          onPress={() =>
                            handleDeleteComment(commentId, isCommentAuthor)
                          }
                        >
                          <FontAwesome
                            name="trash-o"
                            size={16}
                            color="#e74c3c"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingTop: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  backBtnText: {
    color: "#007bff",
    fontSize: 16,
  },

  // Article
  article: {
    backgroundColor: "#f5f5f5",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },

  // Sous Header
  sousHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sousHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  light: {
    width: 15,
    height: 15,
    borderRadius: 5,
  },
  postType: {
    fontWeight: "bold",
    fontStyle: "italic",
    textTransform: "capitalize",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPending: {
    backgroundColor: "#fff3cd",
  },
  statusRejected: {
    backgroundColor: "#f8d7da",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Avatar
  avatar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  avatarInfo: {
    gap: 2,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
  },
  dateText: {
    color: "#999",
    fontSize: 12,
  },

  // Content
  titre: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
  },
  content: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    marginBottom: 15,
  },

  // Event / Reco Info
  eventInfo: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 15,
  },
  recoInfo: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  starsContainer: {
    flexDirection: "row",
  },
  noteValue: {
    color: "#666",
    fontSize: 14,
  },

  // Images
  imagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 15,
  },
  postImage: {
    width: "48%",
    height: 150,
    borderRadius: 10,
  },
  singleImage: {
    width: "100%",
    height: 250,
  },

  // Interaction
  interaction: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  number: {
    color: "#666",
    fontSize: 14,
  },

  // Pending / Rejected
  pendingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  pendingText: {
    color: "#856404",
  },
  rejectedContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f8d7da",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  rejectedText: {
    color: "#721c24",
    flex: 1,
  },

  // Comments Section
  commentsSection: {
    backgroundColor: "#f5f5f5",
    borderRadius: 15,
    padding: 15,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  commentForm: {
    marginBottom: 20,
    gap: 10,
  },
  commentInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  commentError: {
    color: "#e74c3c",
    fontSize: 12,
  },
  sendBtn: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#7fb8ff",
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  loginPrompt: {
    backgroundColor: "#e8f4fd",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  loginPromptText: {
    color: "#007bff",
    textAlign: "center",
  },
  noComments: {
    color: "#999",
    textAlign: "center",
    paddingVertical: 20,
  },

  // Comment Item
  commentItem: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: "row",
    gap: 10,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  commentAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
  },
  commentAvatarText: {
    color: "#fff",
    fontWeight: "bold",
  },
  commentMeta: {
    flex: 1,
    gap: 4,
  },
  commentAuthor: {
    fontWeight: "600",
    fontSize: 14,
  },
  commentContent: {
    fontSize: 14,
    color: "#333",
  },
  commentDate: {
    fontSize: 12,
    color: "#999",
  },
  deleteCommentBtn: {
    padding: 5,
  },
});
