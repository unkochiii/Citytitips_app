// app/commerce/create.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "https://api--tanjablabla--t4nqvl4d28d8.code.run";

const DEFAULT_CATEGORIES = [
  { value: "sante", label: "Santé" },
  { value: "alimentaire", label: "Alimentaire" },
  { value: "sport", label: "Sport" },
  { value: "beaute", label: "Beauté" },
  { value: "vetements", label: "Vêtements" },
  { value: "electronique", label: "Électronique" },
  { value: "maison", label: "Maison" },
  { value: "restauration", label: "Restauration" },
  { value: "services", label: "Services" },
  { value: "loisirs", label: "Loisirs" },
  { value: "education", label: "Éducation" },
  { value: "automobile", label: "Automobile" },
  { value: "autres", label: "Autres" },
];

// Categories will be fetched on mount (fallback to DEFAULT_CATEGORIES)

const DAYS = [
  { key: "lundi", label: "Lundi" },
  { key: "mardi", label: "Mardi" },
  { key: "mercredi", label: "Mercredi" },
  { key: "jeudi", label: "Jeudi" },
  { key: "vendredi", label: "Vendredi" },
  { key: "samedi", label: "Samedi" },
  { key: "dimanche", label: "Dimanche" },
];

export default function CreateCommerce() {
  const router = useRouter();
  const { token } = useAuth();

  // Categories from the backend (fallback to DEFAULT_CATEGORIES)
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await axios.get(`${API_URL}/commerce-categories`);
        const cats = response.data?.categories || DEFAULT_CATEGORIES;
        if (mounted && Array.isArray(cats) && cats.length) setCategories(cats);
      } catch (e) {
        console.warn("Erreur récupération catégories:", e.message);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // États du formulaire
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Informations de base
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Adresse
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Contact
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");

  // Horaires
  const [schedule, setSchedule] = useState({
    lundi: { open: "", close: "", closed: false },
    mardi: { open: "", close: "", closed: false },
    mercredi: { open: "", close: "", closed: false },
    jeudi: { open: "", close: "", closed: false },
    vendredi: { open: "", close: "", closed: false },
    samedi: { open: "", close: "", closed: false },
    dimanche: { open: "", close: "", closed: true },
  });

  // Images
  const [logo, setLogo] = useState(null);
  const [images, setImages] = useState([]);

  // Offres
  const [offers, setOffers] = useState([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [newOffer, setNewOffer] = useState({
    title: "",
    description: "",
    discount: "",
  });

  // Sélection d'image pour le logo
  const pickLogo = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission requise",
        "Veuillez autoriser l'accès à la galerie"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogo(result.assets[0]);
    }
  };

  // Sélection d'images multiples
  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert("Limite atteinte", "Vous pouvez ajouter maximum 5 images");
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission requise",
        "Veuillez autoriser l'accès à la galerie"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setImages([...images, ...result.assets].slice(0, 5));
    }
  };

  // Supprimer une image
  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Mettre à jour les horaires
  const updateSchedule = (day, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  // Basculer jour fermé
  const toggleDayClosed = (day) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day].closed,
        open: !prev[day].closed ? "" : prev[day].open,
        close: !prev[day].closed ? "" : prev[day].close,
      },
    }));
  };

  // Ajouter une offre
  const addOffer = () => {
    if (!newOffer.title.trim()) {
      Alert.alert("Erreur", "Le titre de l'offre est requis");
      return;
    }

    setOffers([
      ...offers,
      {
        ...newOffer,
        isActive: true,
        id: Date.now(),
      },
    ]);
    setNewOffer({ title: "", description: "", discount: "" });
    setShowOfferModal(false);
  };

  // Supprimer une offre
  const removeOffer = (id) => {
    setOffers(offers.filter((offer) => offer.id !== id));
  };

  // Validation par étape
  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!name.trim()) {
          Alert.alert("Erreur", "Le nom du commerce est requis");
          return false;
        }
        if (!description.trim()) {
          Alert.alert("Erreur", "La description est requise");
          return false;
        }
        if (!category) {
          Alert.alert("Erreur", "Veuillez sélectionner une catégorie");
          return false;
        }
        return true;
      case 2:
        if (!street.trim()) {
          Alert.alert("Erreur", "L'adresse est requise");
          return false;
        }
        if (!city.trim()) {
          Alert.alert("Erreur", "La ville est requise");
          return false;
        }
        return true;
      case 3:
        return true; // Contact optionnel
      case 4:
        return true; // Images et offres optionnels
      default:
        return true;
    }
  };

  // Navigation entre étapes
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Soumission du formulaire
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);

    try {
      const formData = new FormData();

      // Informations de base
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("category", category);

      // Adresse
      formData.append("street", street.trim());
      formData.append("city", city.trim());
      if (postalCode) formData.append("postalCode", postalCode.trim());

      // Contact
      if (phone) formData.append("phone", phone.trim());
      if (email) formData.append("email", email.trim());
      if (whatsapp) formData.append("whatsapp", whatsapp.trim());
      if (website) formData.append("website", website.trim());

      // Horaires
      formData.append("schedule", JSON.stringify(schedule));

      // Offres
      if (offers.length > 0) {
        formData.append("offers", JSON.stringify(offers));
      }

      // Logo
      if (logo) {
        const logoUri = logo.uri;
        const logoName = logoUri.split("/").pop();
        const logoType = `image/${logoName.split(".").pop()}`;

        formData.append("logo", {
          uri: logoUri,
          name: logoName,
          type: logoType,
        });
      }

      // Images
      images.forEach((image, index) => {
        const imageUri = image.uri;
        const imageName = imageUri.split("/").pop();
        const imageType = `image/${imageName.split(".").pop()}`;

        formData.append("images", {
          uri: imageUri,
          name: imageName,
          type: imageType,
        });
      });

      const response = await axios.post(`${API_URL}/commerce`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      Alert.alert(
        "Succès ! 🎉",
        "Votre commerce a été soumis et est en attente de validation par un administrateur.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Erreur création commerce:", error);

      if (error.response?.status === 409) {
        Alert.alert(
          "Commerce existant",
          "Vous avez déjà un commerce en cours de validation ou approuvé."
        );
      } else {
        Alert.alert(
          "Erreur",
          error.response?.data?.message || "Une erreur est survenue"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Rendu de l'étape 1 : Informations de base
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Informations de base</Text>
      <Text style={styles.stepSubtitle}>
        Décrivez votre commerce pour attirer des clients
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nom du commerce *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Boulangerie du Centre"
          value={name}
          onChangeText={setName}
          maxLength={100}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Décrivez votre commerce, vos produits/services..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Catégorie *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text
            style={[
              styles.selectButtonText,
              !category && styles.selectButtonPlaceholder,
            ]}
          >
            {category
              ? categories.find((c) => c.value === category)?.label
              : "Sélectionner une catégorie"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Rendu de l'étape 2 : Adresse
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Adresse</Text>
      <Text style={styles.stepSubtitle}>Où se trouve votre commerce ?</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Adresse / Rue *</Text>
        <TextInput
          key={`street-${currentStep}`} // Force re-création au changement d'étape
          style={styles.input}
          placeholder="Ex: 123 Avenue Mohammed V"
          defaultValue={street}
          onChangeText={setStreet}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Ville *</Text>
        <TextInput
          key={`city-${currentStep}`}
          style={styles.input}
          placeholder="Ex: Tanger"
          defaultValue={city}
          onChangeText={setCity}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Code postal</Text>
        <TextInput
          key={`postal-${currentStep}`}
          style={styles.input}
          placeholder="Ex: 90000"
          defaultValue={postalCode}
          onChangeText={setPostalCode}
          keyboardType="numeric"
        />
      </View>
    </View>
  );
  // Rendu de l'étape 3 : Contact et horaires
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Contact & Horaires</Text>
      <Text style={styles.stepSubtitle}>
        Comment vos clients peuvent vous joindre ?
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Téléphone</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: +212 6 12 34 56 78"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: contact@moncommerce.ma"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>WhatsApp</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: +212 6 12 34 56 78"
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Site web</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: www.moncommerce.ma"
          value={website}
          onChangeText={setWebsite}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>Horaires d'ouverture</Text>
        {DAYS.map((day) => (
          <View key={day.key} style={styles.scheduleRow}>
            <View style={styles.scheduleDay}>
              <Text style={styles.scheduleDayText}>{day.label}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.closedToggle,
                schedule[day.key].closed && styles.closedToggleActive,
              ]}
              onPress={() => toggleDayClosed(day.key)}
            >
              <Text
                style={[
                  styles.closedToggleText,
                  schedule[day.key].closed && styles.closedToggleTextActive,
                ]}
              >
                Fermé
              </Text>
            </TouchableOpacity>

            {!schedule[day.key].closed && (
              <View style={styles.scheduleInputs}>
                <TextInput
                  style={styles.scheduleInput}
                  placeholder="09:00"
                  value={schedule[day.key].open}
                  onChangeText={(value) =>
                    updateSchedule(day.key, "open", value)
                  }
                />
                <Text style={styles.scheduleSeparator}>-</Text>
                <TextInput
                  style={styles.scheduleInput}
                  placeholder="18:00"
                  value={schedule[day.key].close}
                  onChangeText={(value) =>
                    updateSchedule(day.key, "close", value)
                  }
                />
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  // Rendu de l'étape 4 : Images et offres
  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Images & Offres</Text>
      <Text style={styles.stepSubtitle}>
        Ajoutez des photos et des offres spéciales
      </Text>

      {/* Logo */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Logo du commerce</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickLogo}>
          {logo ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: logo.uri }} style={styles.logoPreview} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setLogo(null)}
              >
                <Ionicons name="close-circle" size={24} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePickerContent}>
              <Ionicons name="camera-outline" size={40} color="#999" />
              <Text style={styles.imagePickerText}>Ajouter un logo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Images */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Photos du commerce ({images.length}/5)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: image.uri }}
                  style={styles.imagePreview}
                />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                <Ionicons name="add" size={30} color="#007bff" />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Offres */}
      <View style={styles.inputGroup}>
        <View style={styles.offersHeader}>
          <Text style={styles.label}>Offres spéciales</Text>
          <TouchableOpacity
            style={styles.addOfferBtn}
            onPress={() => setShowOfferModal(true)}
          >
            <Ionicons name="add-circle" size={24} color="#007bff" />
            <Text style={styles.addOfferText}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {offers.length === 0 ? (
          <Text style={styles.noOffersText}>
            Aucune offre ajoutée. Les offres peuvent attirer plus de clients !
          </Text>
        ) : (
          offers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerInfo}>
                <Text style={styles.offerTitle}>{offer.title}</Text>
                {offer.description && (
                  <Text style={styles.offerDescription}>
                    {offer.description}
                  </Text>
                )}
                {offer.discount && (
                  <View style={styles.offerDiscount}>
                    <Ionicons name="pricetag" size={14} color="#28a745" />
                    <Text style={styles.offerDiscountText}>
                      {offer.discount}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => removeOffer(offer.id)}>
                <Ionicons name="trash-outline" size={20} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );

  // Rendu du contenu selon l'étape
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajouter mon commerce</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(currentStep / totalSteps) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Étape {currentStep} sur {totalSteps}
        </Text>
      </View>

      {/* Contenu scrollable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        {renderStepContent()}
      </ScrollView>

      {/* Boutons de navigation */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.prevBtn} onPress={prevStep}>
            <Ionicons name="arrow-back" size={20} color="#007bff" />
            <Text style={styles.prevBtnText}>Précédent</Text>
          </TouchableOpacity>
        )}

        {currentStep < totalSteps ? (
          <TouchableOpacity
            style={[styles.nextBtn, currentStep === 1 && styles.nextBtnFull]}
            onPress={nextStep}
          >
            <Text style={styles.nextBtnText}>Suivant</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Soumettre</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Modal sélection catégorie */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCategoryModal(false)}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner une catégorie</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.modalItem,
                  category === cat.value && styles.modalItemSelected,
                ]}
                onPress={() => {
                  setCategory(cat.value);
                  setShowCategoryModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    category === cat.value && styles.modalItemTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
                {category === cat.value && (
                  <Ionicons name="checkmark" size={20} color="#007bff" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal ajout offre */}
      <Modal
        visible={showOfferModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOfferModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowOfferModal(false)}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter une offre</Text>
            <TouchableOpacity onPress={() => setShowOfferModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Titre de l'offre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: -20% sur tout le magasin"
                value={newOffer.title}
                onChangeText={(text) =>
                  setNewOffer({ ...newOffer, title: text })
                }
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Détails de l'offre..."
                value={newOffer.description}
                onChangeText={(text) =>
                  setNewOffer({ ...newOffer, description: text })
                }
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Réduction</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: -20% ou -50 DH"
                value={newOffer.discount}
                onChangeText={(text) =>
                  setNewOffer({ ...newOffer, discount: text })
                }
              />
            </View>
            <TouchableOpacity
              style={styles.addOfferSubmitBtn}
              onPress={addOffer}
            >
              <Text style={styles.addOfferSubmitText}>Ajouter l'offre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
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
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerRight: {
    width: 34,
  },
  progressContainer: {
    padding: 15,
    backgroundColor: "#fff",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007bff",
    borderRadius: 3,
  },
  progressText: {
    textAlign: "center",
    marginTop: 8,
    color: "#666",
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 30,
  },
  stepContent: {
    gap: 15,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    color: "#999",
    fontSize: 12,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#333",
  },
  selectButtonPlaceholder: {
    color: "#999",
  },
  scheduleSection: {
    marginTop: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  scheduleDay: {
    width: 80,
  },
  scheduleDayText: {
    fontSize: 14,
    color: "#333",
  },
  closedToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
  },
  closedToggleActive: {
    backgroundColor: "#e74c3c",
  },
  closedToggleText: {
    fontSize: 12,
    color: "#666",
  },
  closedToggleTextActive: {
    color: "#fff",
  },
  scheduleInputs: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  scheduleInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: 60,
    textAlign: "center",
    fontSize: 14,
  },
  scheduleSeparator: {
    color: "#666",
  },
  imagePicker: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  imagePickerContent: {
    alignItems: "center",
    gap: 10,
  },
  imagePickerText: {
    color: "#999",
    fontSize: 14,
  },
  imagePreviewContainer: {
    position: "relative",
  },
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
  },
  removeImageBtn: {
    position: "absolute",
    top: -8,
    right: 2,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  imagesContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#007bff",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  offersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addOfferBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  addOfferText: {
    color: "#007bff",
    fontWeight: "600",
  },
  noOffersText: {
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  offerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  offerInfo: {
    flex: 1,
    gap: 5,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  offerDescription: {
    fontSize: 12,
    color: "#666",
  },
  offerDiscount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  offerDiscountText: {
    color: "#28a745",
    fontWeight: "600",
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 10,
  },
  prevBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 5,
  },
  prevBtnText: {
    color: "#007bff",
    fontSize: 16,
    fontWeight: "600",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    gap: 5,
    flex: 1,
    maxWidth: 200,
  },
  nextBtnFull: {
    flex: 1,
    maxWidth: "100%",
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28a745",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    gap: 8,
    flex: 1,
  },
  submitBtnDisabled: {
    backgroundColor: "#ccc",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalList: {
    padding: 10,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  modalItemSelected: {
    backgroundColor: "#e8f4fd",
  },
  modalItemText: {
    fontSize: 16,
    color: "#333",
  },
  modalItemTextSelected: {
    color: "#007bff",
    fontWeight: "600",
  },
  modalBody: {
    padding: 20,
    gap: 15,
  },
  addOfferSubmitBtn: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  addOfferSubmitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
