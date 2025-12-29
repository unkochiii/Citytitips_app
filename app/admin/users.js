// app/admin/users.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const ROLES = [
  { value: "user", label: "User", color: "#e2e8f0", textColor: "#4a5568" },
  { value: "admin", label: "Admin", color: "#fed7d7", textColor: "#c53030" },
  {
    value: "superAdmin",
    label: "Super Admin",
    color: "#c6f6d5",
    textColor: "#276749",
  },
];

export default function UsersPage() {
  const router = useRouter();
  const { token, user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(null);

  // ✅ State pour le modal de sélection de rôle
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "superAdmin";

  // ✅ Récupérer les utilisateurs
  const fetchUsers = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await axios.get(
        "https://api--tanjablabla--t4nqvl4d28d8.code.run/users",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUsers(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error("Erreur:", err);
      setError(
        err.response?.data?.message ||
          "Erreur lors de la récupération des utilisateurs"
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Redirection si pas admin
    if (!isAdmin) {
      Alert.alert("Accès refusé", "Vous n'avez pas les droits d'accès", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
      return;
    }

    fetchUsers();
  }, [isAdmin, fetchUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, [fetchUsers]);

  // ✅ Ouvrir le modal de sélection de rôle
  const openRoleModal = (user) => {
    setSelectedUser(user);
    setRoleModalVisible(true);
  };

  // ✅ Modifier le rôle d'un utilisateur
  const handleRoleChange = async (newRole) => {
    if (!selectedUser) return;

    setRoleModalVisible(false);

    // Si même rôle, ne rien faire
    if (selectedUser.role === newRole) return;

    Alert.alert(
      "Changer le rôle",
      `Changer le rôle de ${
        selectedUser.account?.username || selectedUser.email
      } en "${newRole}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            try {
              setUpdatingRole(selectedUser._id);

              await axios.put(
                `https://api--tanjablabla--t4nqvl4d28d8.code.run/user/${selectedUser._id}/role`,
                { role: newRole },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              // Mettre à jour le state local
              setUsers((prevUsers) =>
                prevUsers.map((user) =>
                  user._id === selectedUser._id
                    ? { ...user, role: newRole }
                    : user
                )
              );

              Alert.alert("Succès", "Rôle modifié avec succès !");
            } catch (err) {
              Alert.alert(
                "Erreur",
                err.response?.data?.message || "Erreur lors de la modification"
              );
              fetchUsers(); // Refresh pour remettre l'ancienne valeur
            } finally {
              setUpdatingRole(null);
              setSelectedUser(null);
            }
          },
        },
      ]
    );
  };

  // ✅ Supprimer un utilisateur
  const handleDelete = (userId, userEmail, username) => {
    Alert.alert(
      "Supprimer l'utilisateur",
      `Êtes-vous sûr de vouloir supprimer ${
        username || userEmail
      } ?\n\nCette action est irréversible.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(
                `https://api--tanjablabla--t4nqvl4d28d8.code.run/user/${userId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              setUsers((prevUsers) =>
                prevUsers.filter((user) => user._id !== userId)
              );
              Alert.alert("Succès", "Utilisateur supprimé avec succès");
            } catch (err) {
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

  // ✅ Obtenir le style du rôle
  const getRoleStyle = (role) => {
    const roleConfig = ROLES.find((r) => r.value === role) || ROLES[0];
    return {
      backgroundColor: roleConfig.color,
      textColor: roleConfig.textColor,
      label: roleConfig.label,
    };
  };

  // Si pas admin, ne rien afficher
  if (!isAdmin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestion des utilisateurs</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ✅ Compteur */}
        <View style={styles.countContainer}>
          <Ionicons name="people" size={20} color="#4a5568" />
          <Text style={styles.countText}>
            Total: {users.length} utilisateur{users.length > 1 ? "s" : ""}
          </Text>
        </View>

        {/* ✅ Message d'erreur */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={20} color="#721c24" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ✅ Message si aucun utilisateur */}
        {users.length === 0 && !error ? (
          <View style={styles.noResults}>
            <Ionicons name="people-outline" size={60} color="#999" />
            <Text style={styles.noResultsText}>Aucun utilisateur trouvé</Text>
          </View>
        ) : null}

        {/* ✅ Liste des utilisateurs */}
        {users.map((user) => {
          const roleStyle = getRoleStyle(user.role);
          const isUpdating = updatingRole === user._id;

          return (
            <View key={user._id} style={styles.userCard}>
              {/* Profil */}
              <View style={styles.userProfile}>
                {user?.account?.avatar?.secure_url ? (
                  <Image
                    source={{ uri: user.account.avatar.secure_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>
                      {user?.account?.username?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  </View>
                )}

                <View style={styles.userInfo}>
                  <Text style={styles.username}>
                    {user.account?.username || "Sans nom"}
                  </Text>
                  <Text style={styles.email}>{user.email || "-"}</Text>
                </View>
              </View>

              {/* Rôle */}
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  { backgroundColor: roleStyle.backgroundColor },
                ]}
                onPress={() => openRoleModal(user)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={roleStyle.textColor} />
                ) : (
                  <>
                    <Text
                      style={[styles.roleText, { color: roleStyle.textColor }]}
                    >
                      {roleStyle.label}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={roleStyle.textColor}
                    />
                  </>
                )}
              </TouchableOpacity>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() =>
                    handleDelete(user._id, user.email, user.account?.username)
                  }
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Espace en bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ✅ Modal de sélection de rôle */}
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRoleModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Changer le rôle</Text>
            {selectedUser && (
              <Text style={styles.modalSubtitle}>
                {selectedUser.account?.username || selectedUser.email}
              </Text>
            )}

            <View style={styles.roleOptions}>
              {ROLES.map((role) => {
                const isSelected = selectedUser?.role === role.value;

                return (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleOption,
                      { backgroundColor: role.color },
                      isSelected && styles.roleOptionSelected,
                    ]}
                    onPress={() => handleRoleChange(role.value)}
                  >
                    <Text
                      style={[styles.roleOptionText, { color: role.textColor }]}
                    >
                      {role.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={role.textColor}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setRoleModalVisible(false)}
            >
              <Text style={styles.modalCancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#666",
    marginTop: 10,
  },

  // ========== HEADER ==========
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  // ========== SCROLL ==========
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },

  // ========== COUNT ==========
  countContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
  },
  countText: {
    fontSize: 14,
    color: "#4a5568",
    fontWeight: "600",
  },

  // ========== ERROR ==========
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8d7da",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    gap: 10,
  },
  errorText: {
    color: "#721c24",
    flex: 1,
  },

  // ========== NO RESULTS ==========
  noResults: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 15,
  },
  noResultsText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
  },

  // ========== USER CARD ==========
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userProfile: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
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
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  email: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },

  // ========== ROLE BUTTON ==========
  roleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  roleText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // ========== ACTIONS ==========
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  deleteBtn: {
    backgroundColor: "#e74c3c",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // ========== MODAL ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 20,
  },
  roleOptions: {
    gap: 10,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 10,
  },
  roleOptionSelected: {
    borderWidth: 2,
    borderColor: "#333",
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalCancelBtn: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#e9ecef",
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#495057",
    fontWeight: "600",
    fontSize: 16,
  },

  // ========== BOTTOM SPACER ==========
  bottomSpacer: {
    height: 30,
  },
});
