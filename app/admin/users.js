// app/(tabs)/admin/users.js
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
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "https://api--tanjablabla--t4nqvl4d28d8.code.run";

// Tous les rôles possibles
const ALL_ROLES = [
  { value: "user", label: "User", color: "#e2e8f0", textColor: "#4a5568" },
  {
    value: "commerce",
    label: "Commerce",
    color: "#fef3c7",
    textColor: "#92400e",
  },
  { value: "admin", label: "Admin", color: "#fed7d7", textColor: "#c53030" },
  {
    value: "superAdmin",
    label: "Super Admin",
    color: "#c6f6d5",
    textColor: "#276749",
  },
];

// Rôles que les admins simples peuvent attribuer/retirer
const ADMIN_ALLOWED_ROLES = ["commerce"];

// Liste des villes disponibles (vous pouvez la personnaliser)
const AVAILABLE_CITIES = [
  "tanger",
  "tetouan",
  "casablanca",
  "rabat",
  "marrakech",
  "fes",
  "agadir",
  "meknes",
  "oujda",
  "kenitra",
];

export default function UsersPage() {
  const router = useRouter();
  const { token, user: currentUser, refreshUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [adminCities, setAdminCities] = useState([]);

  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // ✅ NOUVEAU : État pour le modal des villes admin
  const [citiesModalVisible, setCitiesModalVisible] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [selectedCities, setSelectedCities] = useState([]);
  const [customCity, setCustomCity] = useState("");

  // ✅ Vérifier si l'utilisateur connecté est superAdmin
  const isSuperAdmin = useCallback(() => {
    const roles = currentUser?.roles || [];
    return roles.includes("superAdmin");
  }, [currentUser]);

  // ✅ Helper pour obtenir le rôle principal d'un user
  const getPrimaryRole = (user) => {
    if (user?.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      const priority = ["superAdmin", "admin", "commerce", "user"];
      for (const role of priority) {
        if (user.roles.includes(role)) return role;
      }
      return user.roles[0];
    }
    return user?.role || "user";
  };

  // ✅ Récupérer les utilisateurs via /admin/users
  const fetchUsers = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(
        "fetchUsers response.data:",
        JSON.stringify(response.data, null, 2)
      );

      const payload = response.data?.data || response.data || {};

      let usersArray = [];
      if (Array.isArray(payload.users)) {
        usersArray = payload.users;
      } else if (Array.isArray(payload.data?.users)) {
        usersArray = payload.data.users;
      } else if (Array.isArray(payload)) {
        usersArray = payload;
      }

      if (payload.adminCities) {
        setAdminCities(
          payload.adminCities === "all" ? ["all"] : payload.adminCities
        );
      }

      const normalizedUsers = usersArray.map((u) => {
        const roles = Array.isArray(u.roles)
          ? u.roles
          : u.role
          ? [u.role]
          : ["user"];
        return { ...u, roles };
      });

      setUsers(normalizedUsers);
      setError(null);
    } catch (err) {
      console.error("Erreur:", err);

      if (err.response?.status === 401) {
        Alert.alert(
          "Session expirée",
          "Votre session a expiré. Veuillez vous reconnecter.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
      } else if (err.response?.status === 403) {
        const updated = refreshUser ? await refreshUser() : null;
        const userRoles = updated?.roles || [];
        const stillAdmin =
          userRoles.includes("admin") || userRoles.includes("superAdmin");

        if (updated && !stillAdmin) {
          Alert.alert(
            "Accès refusé",
            "Votre rôle a changé et vous n'êtes plus administrateur.",
            [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
          );
        } else {
          Alert.alert(
            "Accès refusé",
            "Vous n'avez pas les permissions nécessaires.",
            [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
          );
        }
      } else {
        setError(
          err.response?.data?.message ||
            "Erreur lors de la récupération des utilisateurs"
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, router, refreshUser]);

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token, fetchUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, [fetchUsers]);

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setRoleModalVisible(true);
  };

  // ✅ NOUVEAU : Ouvrir le modal de sélection des villes
  const openCitiesModal = (user, newRole, hasRole, newRoles) => {
    // Pré-remplir avec les villes existantes de l'utilisateur ou sa ville actuelle
    const existingCities = user.adminCities || [];
    const userCity = user.location?.city;

    if (existingCities.length > 0) {
      setSelectedCities(existingCities);
    } else if (userCity) {
      setSelectedCities([userCity.toLowerCase()]);
    } else {
      setSelectedCities([]);
    }

    setPendingRoleChange({ user, newRole, hasRole, newRoles });
    setCitiesModalVisible(true);
  };

  // ✅ NOUVEAU : Ajouter/Retirer une ville de la sélection
  const toggleCity = (city) => {
    const normalizedCity = city.toLowerCase().trim();
    setSelectedCities((prev) =>
      prev.includes(normalizedCity)
        ? prev.filter((c) => c !== normalizedCity)
        : [...prev, normalizedCity]
    );
  };

  // ✅ NOUVEAU : Ajouter une ville personnalisée
  const addCustomCity = () => {
    if (customCity.trim()) {
      const normalizedCity = customCity.toLowerCase().trim();
      if (!selectedCities.includes(normalizedCity)) {
        setSelectedCities((prev) => [...prev, normalizedCity]);
      }
      setCustomCity("");
    }
  };

  // ✅ NOUVEAU : Confirmer le changement de rôle avec les villes
  const confirmRoleChangeWithCities = async () => {
    if (!pendingRoleChange) return;

    const { user, newRoles } = pendingRoleChange;

    if (selectedCities.length === 0) {
      Alert.alert(
        "Erreur",
        "Vous devez sélectionner au moins une ville pour un admin"
      );
      return;
    }

    setCitiesModalVisible(false);

    try {
      setUpdatingRole(user._id);

      await axios.put(
        `${API_BASE_URL}/admin/user/${user._id}/roles`,
        {
          roles: newRoles,
          adminCities: selectedCities,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Mettre à jour l'état local
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u._id === user._id
            ? { ...u, roles: newRoles, adminCities: selectedCities }
            : u
        )
      );

      Alert.alert("Succès", "Rôle admin ajouté avec succès !");
    } catch (err) {
      console.error("Erreur changement rôle:", err.response?.data);
      Alert.alert(
        "Erreur",
        err.response?.data?.message || "Erreur lors de la modification"
      );
      fetchUsers();
    } finally {
      setUpdatingRole(null);
      setSelectedUser(null);
      setPendingRoleChange(null);
      setSelectedCities([]);
    }
  };

  // ✅ Gérer le changement de rôle selon le type d'admin
  const handleRoleChange = async (newRole) => {
    if (!selectedUser) return;

    setRoleModalVisible(false);

    const selectedRoles = selectedUser?.roles || [];
    const hasRole = selectedRoles.includes(newRole);

    // Calculer les nouveaux rôles
    let newRoles;
    if (hasRole) {
      newRoles = selectedRoles.filter((r) => r !== newRole);
      if (newRoles.length === 0) newRoles = ["user"];
    } else {
      newRoles = [...selectedRoles, newRole];
    }

    // ✅ Si on AJOUTE le rôle admin (et pas superAdmin), demander les villes
    if (!hasRole && newRole === "admin" && isSuperAdmin()) {
      openCitiesModal(selectedUser, newRole, hasRole, newRoles);
      return;
    }

    const action = hasRole ? "remove" : "add";
    const actionText = hasRole ? "Retirer" : "Attribuer";

    Alert.alert(
      `${actionText} le rôle`,
      `${actionText} le rôle "${newRole}" ${hasRole ? "de" : "à"} ${
        selectedUser.account?.username || selectedUser.email
      } ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            try {
              setUpdatingRole(selectedUser._id);

              if (isSuperAdmin()) {
                // SuperAdmin: gérer via /admin/user/:id/roles
                const requestBody = { roles: newRoles };

                // Si on garde le rôle admin, conserver les adminCities existantes
                if (
                  newRoles.includes("admin") &&
                  !newRoles.includes("superAdmin")
                ) {
                  requestBody.adminCities = selectedUser.adminCities || [];
                }

                await axios.put(
                  `${API_BASE_URL}/admin/user/${selectedUser._id}/roles`,
                  requestBody,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                setUsers((prevUsers) =>
                  prevUsers.map((user) =>
                    user._id === selectedUser._id
                      ? {
                          ...user,
                          roles: newRoles,
                          adminCities: newRoles.includes("admin")
                            ? user.adminCities
                            : [],
                        }
                      : user
                  )
                );
              } else {
                // Admin simple: ne peut gérer que certains rôles (commerce)
                const endpoint = hasRole
                  ? `${API_BASE_URL}/admin/user/${selectedUser._id}/remove-role`
                  : `${API_BASE_URL}/admin/user/${selectedUser._id}/add-role`;

                await axios.put(
                  endpoint,
                  { role: newRole },
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                setUsers((prevUsers) =>
                  prevUsers.map((user) => {
                    if (user._id === selectedUser._id) {
                      let updatedRoles;
                      if (hasRole) {
                        updatedRoles = user.roles.filter((r) => r !== newRole);
                        if (updatedRoles.length === 0) updatedRoles = ["user"];
                      } else {
                        updatedRoles = [...user.roles, newRole];
                      }
                      return { ...user, roles: updatedRoles };
                    }
                    return user;
                  })
                );
              }

              Alert.alert(
                "Succès",
                `Rôle ${hasRole ? "retiré" : "ajouté"} avec succès !`
              );
            } catch (err) {
              console.error("Erreur changement rôle:", err.response?.data);
              Alert.alert(
                "Erreur",
                err.response?.data?.message || "Erreur lors de la modification"
              );
              fetchUsers();
            } finally {
              setUpdatingRole(null);
              setSelectedUser(null);
            }
          },
        },
      ]
    );
  };

  // ✅ Suppression via /admin/user/:id
  const handleDelete = (userId, userEmail, username) => {
    if (userId === currentUser._id) {
      Alert.alert(
        "Erreur",
        "Vous ne pouvez pas supprimer votre propre compte."
      );
      return;
    }

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
              await axios.delete(`${API_BASE_URL}/admin/user/${userId}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

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

  // ✅ NOUVEAU : Modifier les villes d'un admin existant
  const handleEditAdminCities = (user) => {
    setSelectedCities(user.adminCities || []);
    setSelectedUser(user);
    setPendingRoleChange({
      user,
      newRole: "admin",
      hasRole: true,
      newRoles: user.roles,
      editCitiesOnly: true,
    });
    setCitiesModalVisible(true);
  };

  // ✅ NOUVEAU : Confirmer la modification des villes uniquement
  const confirmEditCities = async () => {
    if (!pendingRoleChange || !pendingRoleChange.editCitiesOnly) {
      confirmRoleChangeWithCities();
      return;
    }

    const { user } = pendingRoleChange;

    if (selectedCities.length === 0) {
      Alert.alert("Erreur", "Un admin doit avoir au moins une ville");
      return;
    }

    setCitiesModalVisible(false);

    try {
      setUpdatingRole(user._id);

      await axios.put(
        `${API_BASE_URL}/admin/user/${user._id}/roles`,
        {
          roles: user.roles,
          adminCities: selectedCities,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u._id === user._id ? { ...u, adminCities: selectedCities } : u
        )
      );

      Alert.alert("Succès", "Villes admin mises à jour avec succès !");
    } catch (err) {
      console.error("Erreur modification villes:", err.response?.data);
      Alert.alert(
        "Erreur",
        err.response?.data?.message || "Erreur lors de la modification"
      );
      fetchUsers();
    } finally {
      setUpdatingRole(null);
      setSelectedUser(null);
      setPendingRoleChange(null);
      setSelectedCities([]);
    }
  };

  const getAvailableRoles = () => {
    if (isSuperAdmin()) {
      return ALL_ROLES;
    }
    return ALL_ROLES.filter((r) => ADMIN_ALLOWED_ROLES.includes(r.value));
  };

  const canModifyUserRole = (user) => {
    if (user._id === currentUser._id) return false;
    if (isSuperAdmin()) return true;
    const userRoles = user?.roles || [];
    if (userRoles.includes("admin") || userRoles.includes("superAdmin")) {
      return false;
    }
    return true;
  };

  const getRoleStyle = (user) => {
    const role = getPrimaryRole(user);
    const roleConfig = ALL_ROLES.find((r) => r.value === role) || ALL_ROLES[0];
    return {
      backgroundColor: roleConfig.color,
      textColor: roleConfig.textColor,
      label: roleConfig.label,
    };
  };

  const getCurrentRoleBadge = () => {
    const primaryRole = getPrimaryRole(currentUser);
    const roleConfig = ALL_ROLES.find((r) => r.value === primaryRole);
    return roleConfig || ALL_ROLES[0];
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const currentRoleBadge = getCurrentRoleBadge();
  const availableRoles = getAvailableRoles();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestion des utilisateurs</Text>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.adminBadge,
              { backgroundColor: currentRoleBadge.color },
            ]}
          >
            <Text
              style={[
                styles.adminBadgeText,
                { color: currentRoleBadge.textColor },
              ]}
            >
              {currentRoleBadge.label}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info utilisateur connecté */}
        <View style={styles.userInfoContainer}>
          <Ionicons name="person-circle-outline" size={16} color="#007bff" />
          <Text style={styles.userInfoText}>
            Connecté : {currentUser?.username || currentUser?.account?.username}{" "}
            ({getPrimaryRole(currentUser)})
          </Text>
        </View>

        {/* Info villes admin (pour admins non-superAdmin) */}
        {!isSuperAdmin() && adminCities.length > 0 && (
          <View style={styles.citiesInfoContainer}>
            <Ionicons name="location-outline" size={16} color="#6b7280" />
            <Text style={styles.citiesInfoText}>
              Villes gérées : {adminCities.join(", ")}
            </Text>
          </View>
        )}

        {/* Compteur */}
        <View style={styles.countContainer}>
          <Ionicons name="people" size={20} color="#4a5568" />
          <Text style={styles.countText}>
            Total: {users?.length || 0} utilisateur
            {(users?.length || 0) > 1 ? "s" : ""}
          </Text>
        </View>

        {/* Info permissions admin */}
        {!isSuperAdmin() && (
          <View style={styles.permissionInfo}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#6b7280"
            />
            <Text style={styles.permissionInfoText}>
              En tant qu'admin, vous pouvez uniquement attribuer/retirer le rôle
              "Commerce"
            </Text>
          </View>
        )}

        {/* Message d'erreur */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={20} color="#721c24" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Message si aucun utilisateur */}
        {(!Array.isArray(users) || users.length === 0) && !error ? (
          <View style={styles.noResults}>
            <Ionicons name="people-outline" size={60} color="#999" />
            <Text style={styles.noResultsText}>Aucun utilisateur trouvé</Text>
          </View>
        ) : null}

        {/* Liste des utilisateurs */}
        {Array.isArray(users) &&
          users.map((user) => {
            const roleStyle = getRoleStyle(user);
            const isUpdating = updatingRole === user._id;
            const isCurrentUser = user._id === currentUser._id;
            const canModify = canModifyUserRole(user);
            const isAdmin = user.roles?.includes("admin");
            const isUserSuperAdmin = user.roles?.includes("superAdmin");

            return (
              <View
                key={user._id}
                style={[
                  styles.userCard,
                  isCurrentUser && styles.currentUserCard,
                ]}
              >
                {/* Badge "Vous" si c'est l'utilisateur connecté */}
                {isCurrentUser && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>Vous</Text>
                  </View>
                )}

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
                        {user?.account?.username?.charAt(0).toUpperCase() ||
                          "?"}
                      </Text>
                    </View>
                  )}

                  <View style={styles.userInfo}>
                    <Text style={styles.username}>
                      {user.account?.username || "Sans nom"}
                    </Text>
                    <Text style={styles.email}>{user.email || "-"}</Text>
                    {/* Afficher la ville de l'utilisateur */}
                    {user.location?.city && (
                      <View style={styles.cityContainer}>
                        <Ionicons
                          name="location-outline"
                          size={12}
                          color="#6b7280"
                        />
                        <Text style={styles.cityText}>
                          {user.location.city}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Rôles - Afficher tous les rôles */}
                <View style={styles.rolesContainer}>
                  {(user.roles || ["user"]).map((role) => {
                    const config =
                      ALL_ROLES.find((r) => r.value === role) || ALL_ROLES[0];
                    return (
                      <View
                        key={role}
                        style={[
                          styles.roleBadge,
                          { backgroundColor: config.color },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            { color: config.textColor },
                          ]}
                        >
                          {config.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* ✅ NOUVEAU : Afficher les villes admin si l'utilisateur est admin */}
                {isAdmin &&
                  !isUserSuperAdmin &&
                  user.adminCities?.length > 0 && (
                    <View style={styles.adminCitiesContainer}>
                      <View style={styles.adminCitiesHeader}>
                        <Ionicons
                          name="business-outline"
                          size={14}
                          color="#c53030"
                        />
                        <Text style={styles.adminCitiesLabel}>
                          Villes administrées :
                        </Text>
                      </View>
                      <View style={styles.adminCitiesList}>
                        {user.adminCities.map((city) => (
                          <View key={city} style={styles.adminCityBadge}>
                            <Text style={styles.adminCityText}>{city}</Text>
                          </View>
                        ))}
                      </View>
                      {/* Bouton modifier les villes (superAdmin uniquement) */}
                      {isSuperAdmin() && !isCurrentUser && (
                        <TouchableOpacity
                          style={styles.editCitiesBtn}
                          onPress={() => handleEditAdminCities(user)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={14}
                            color="#c53030"
                          />
                          <Text style={styles.editCitiesBtnText}>
                            Modifier les villes
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                {/* SuperAdmin indicator */}
                {isUserSuperAdmin && (
                  <View style={styles.superAdminInfo}>
                    <Ionicons name="globe-outline" size={14} color="#276749" />
                    <Text style={styles.superAdminInfoText}>
                      Accès à toutes les villes
                    </Text>
                  </View>
                )}

                {/* Bouton modifier rôle */}
                {canModify && (
                  <TouchableOpacity
                    style={styles.roleButton}
                    onPress={() => openRoleModal(user)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#007bff" />
                    ) : (
                      <>
                        <Ionicons
                          name="create-outline"
                          size={16}
                          color="#007bff"
                        />
                        <Text style={styles.roleButtonText}>
                          Modifier les rôles
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Actions - masquer pour l'utilisateur actuel et les admins si non-superAdmin */}
                {!isCurrentUser && canModify && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() =>
                        handleDelete(
                          user._id,
                          user.email,
                          user.account?.username
                        )
                      }
                    >
                      <Ionicons name="trash-outline" size={20} color="#fff" />
                      <Text style={styles.deleteBtnText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Message si ne peut pas modifier */}
                {!canModify && !isCurrentUser && (
                  <View style={styles.cannotModifyInfo}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={14}
                      color="#6b7280"
                    />
                    <Text style={styles.cannotModifyText}>
                      Seul un superAdmin peut modifier cet utilisateur
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal de sélection de rôle */}
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
            <Text style={styles.modalTitle}>Gérer les rôles</Text>
            {selectedUser && (
              <Text style={styles.modalSubtitle}>
                {selectedUser.account?.username || selectedUser.email}
              </Text>
            )}

            {/* Rôles actuels */}
            {selectedUser && (
              <View style={styles.currentRolesSection}>
                <Text style={styles.currentRolesTitle}>Rôles actuels :</Text>
                <View style={styles.currentRolesList}>
                  {(selectedUser.roles || ["user"]).map((role) => {
                    const config =
                      ALL_ROLES.find((r) => r.value === role) || ALL_ROLES[0];
                    return (
                      <View
                        key={role}
                        style={[
                          styles.currentRoleBadge,
                          { backgroundColor: config.color },
                        ]}
                      >
                        <Text style={{ color: config.textColor, fontSize: 12 }}>
                          {config.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <Text style={styles.availableRolesTitle}>
              {isSuperAdmin()
                ? "Cliquez pour ajouter/retirer :"
                : "Rôles disponibles :"}
            </Text>

            <View style={styles.roleOptions}>
              {availableRoles.map((role) => {
                const selectedRoles = selectedUser?.roles || [];
                const hasRole = selectedRoles.includes(role.value);

                return (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleOption,
                      { backgroundColor: role.color },
                      hasRole && styles.roleOptionSelected,
                    ]}
                    onPress={() => handleRoleChange(role.value)}
                  >
                    <View style={styles.roleOptionContent}>
                      <Text
                        style={[
                          styles.roleOptionText,
                          { color: role.textColor },
                        ]}
                      >
                        {role.label}
                      </Text>
                      <Text
                        style={[
                          styles.roleOptionAction,
                          { color: role.textColor },
                        ]}
                      >
                        {hasRole ? "Retirer" : "Ajouter"}
                        {!hasRole &&
                          role.value === "admin" &&
                          isSuperAdmin() &&
                          " (villes requises)"}
                      </Text>
                    </View>
                    {hasRole && (
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
              <Text style={styles.modalCancelBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ✅ NOUVEAU : Modal de sélection des villes admin */}
      <Modal
        visible={citiesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setCitiesModalVisible(false);
          setPendingRoleChange(null);
          setSelectedCities([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.citiesModalContent}>
            <Text style={styles.modalTitle}>
              {pendingRoleChange?.editCitiesOnly
                ? "Modifier les villes admin"
                : "Sélectionner les villes admin"}
            </Text>
            {pendingRoleChange?.user && (
              <Text style={styles.modalSubtitle}>
                {pendingRoleChange.user.account?.username ||
                  pendingRoleChange.user.email}
              </Text>
            )}

            <Text style={styles.citiesInfoText2}>
              Sélectionnez les villes que cet admin pourra gérer :
            </Text>

            {/* Villes sélectionnées */}
            {selectedCities.length > 0 && (
              <View style={styles.selectedCitiesContainer}>
                <Text style={styles.selectedCitiesLabel}>
                  Villes sélectionnées ({selectedCities.length}) :
                </Text>
                <View style={styles.selectedCitiesList}>
                  {selectedCities.map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={styles.selectedCityBadge}
                      onPress={() => toggleCity(city)}
                    >
                      <Text style={styles.selectedCityText}>{city}</Text>
                      <Ionicons name="close-circle" size={16} color="#c53030" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Liste des villes disponibles */}
            <ScrollView style={styles.citiesScrollView}>
              <Text style={styles.availableCitiesLabel}>
                Villes disponibles :
              </Text>
              <View style={styles.citiesGrid}>
                {AVAILABLE_CITIES.map((city) => {
                  const isSelected = selectedCities.includes(city);
                  return (
                    <TouchableOpacity
                      key={city}
                      style={[
                        styles.cityOption,
                        isSelected && styles.cityOptionSelected,
                      ]}
                      onPress={() => toggleCity(city)}
                    >
                      <Text
                        style={[
                          styles.cityOptionText,
                          isSelected && styles.cityOptionTextSelected,
                        ]}
                      >
                        {city}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Ajouter une ville personnalisée */}
              <View style={styles.customCityContainer}>
                <Text style={styles.customCityLabel}>
                  Ajouter une autre ville :
                </Text>
                <View style={styles.customCityInputContainer}>
                  <TextInput
                    style={styles.customCityInput}
                    placeholder="Nom de la ville"
                    value={customCity}
                    onChangeText={setCustomCity}
                    onSubmitEditing={addCustomCity}
                  />
                  <TouchableOpacity
                    style={styles.addCityBtn}
                    onPress={addCustomCity}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Boutons d'action */}
            <View style={styles.citiesModalActions}>
              <TouchableOpacity
                style={styles.citiesCancelBtn}
                onPress={() => {
                  setCitiesModalVisible(false);
                  setPendingRoleChange(null);
                  setSelectedCities([]);
                }}
              >
                <Text style={styles.citiesCancelBtnText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.citiesConfirmBtn,
                  selectedCities.length === 0 &&
                    styles.citiesConfirmBtnDisabled,
                ]}
                onPress={
                  pendingRoleChange?.editCitiesOnly
                    ? confirmEditCities
                    : confirmRoleChangeWithCities
                }
                disabled={selectedCities.length === 0}
              >
                <Text style={styles.citiesConfirmBtnText}>
                  {pendingRoleChange?.editCitiesOnly
                    ? "Enregistrer"
                    : "Confirmer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    flex: 1,
    marginLeft: 10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },

  // ========== USER INFO ==========
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  userInfoText: {
    fontSize: 12,
    color: "#007bff",
    fontWeight: "500",
  },

  // ========== CITIES INFO ==========
  citiesInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  citiesInfoText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    flex: 1,
  },

  // ========== PERMISSION INFO ==========
  permissionInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  permissionInfoText: {
    fontSize: 11,
    color: "#92400e",
    flex: 1,
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
  currentUserCard: {
    borderWidth: 2,
    borderColor: "#007bff",
    backgroundColor: "#f8fbff",
  },
  youBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#007bff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  youBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
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
  cityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  cityText: {
    fontSize: 12,
    color: "#6b7280",
  },

  // ========== ROLES CONTAINER ==========
  rolesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ========== ADMIN CITIES ==========
  adminCitiesContainer: {
    backgroundColor: "#fef2f2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  adminCitiesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  adminCitiesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c53030",
  },
  adminCitiesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  adminCityBadge: {
    backgroundColor: "#fed7d7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminCityText: {
    fontSize: 11,
    color: "#c53030",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  editCitiesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  editCitiesBtnText: {
    fontSize: 12,
    color: "#c53030",
    fontWeight: "500",
  },

  // ========== SUPER ADMIN INFO ==========
  superAdminInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#c6f6d5",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  superAdminInfoText: {
    fontSize: 12,
    color: "#276749",
    fontWeight: "500",
  },

  // ========== ROLE BUTTON ==========
  roleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
    backgroundColor: "#e3f2fd",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007bff",
  },

  // ========== CANNOT MODIFY INFO ==========
  cannotModifyInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cannotModifyText: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
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
  deleteBtnText: {
    color: "#fff",
    fontWeight: "600",
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
    marginBottom: 15,
  },
  currentRolesSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  currentRolesTitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  currentRolesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  currentRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  availableRolesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
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
  roleOptionContent: {
    flex: 1,
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  roleOptionAction: {
    fontSize: 12,
    marginTop: 2,
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

  // ========== CITIES MODAL ==========
  citiesModalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  citiesInfoText2: {
    fontSize: 13,
    color: "#666",
    marginBottom: 15,
    textAlign: "center",
  },
  selectedCitiesContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
  },
  selectedCitiesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c53030",
    marginBottom: 8,
  },
  selectedCitiesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  selectedCityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fed7d7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 4,
  },
  selectedCityText: {
    fontSize: 12,
    color: "#c53030",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  citiesScrollView: {
    maxHeight: 300,
  },
  availableCitiesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  citiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },
  cityOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  cityOptionSelected: {
    backgroundColor: "#007bff",
  },
  cityOptionText: {
    fontSize: 13,
    color: "#4a5568",
    textTransform: "capitalize",
  },
  cityOptionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  customCityContainer: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  customCityLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  customCityInputContainer: {
    flexDirection: "row",
    gap: 10,
  },
  customCityInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addCityBtn: {
    backgroundColor: "#007bff",
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  citiesModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  citiesCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#e9ecef",
    alignItems: "center",
  },
  citiesCancelBtnText: {
    color: "#495057",
    fontWeight: "600",
    fontSize: 16,
  },
  citiesConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#007bff",
    alignItems: "center",
  },
  citiesConfirmBtnDisabled: {
    backgroundColor: "#ccc",
  },
  citiesConfirmBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

  // ========== BOTTOM SPACER ==========
  bottomSpacer: {
    height: 30,
  },
});
