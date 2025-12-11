// app/(auth)/signup.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { GENRES } from '../../constants/genres';

export default function Signup() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();

    // Données du formulaire
    const [formData, setFormData] = useState({
        pseudo: '',
        email: '',
        password: '',
        confirmPassword: '',
        favoriteGenres: [],
        favoriteBook: '',
    });

    const handleGenreToggle = (genre) => {
        setFormData(prev => ({
            ...prev,
            favoriteGenres: prev.favoriteGenres.includes(genre)
                ? prev.favoriteGenres.filter(g => g !== genre)
                : [...prev.favoriteGenres, genre]
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await signup({
                pseudo: formData.pseudo,
                email: formData.email,
                password: formData.password,
                favoriteGenres: formData.favoriteGenres,
                favoriteBook: formData.favoriteBook,
            });
        } catch (error) {
            Alert.alert('Erreur', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch(step) {
            case 1:
                return (
                    <>
                        <Text style={styles.title}>Créer un compte</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Pseudo"
                            value={formData.pseudo}
                            onChangeText={(val) => setFormData({...formData, pseudo: val})}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={formData.email}
                            onChangeText={(val) => setFormData({...formData, email: val})}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Mot de passe"
                            value={formData.password}
                            onChangeText={(val) => setFormData({...formData, password: val})}
                            secureTextEntry
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirmer le mot de passe"
                            value={formData.confirmPassword}
                            onChangeText={(val) => setFormData({...formData, confirmPassword: val})}
                            secureTextEntry
                        />
                        <TouchableOpacity style={styles.button} onPress={() => setStep(2)}>
                            <Text style={styles.buttonText}>Suivant</Text>
                        </TouchableOpacity>
                    </>
                );

            case 2:
                return (
                    <>
                        <Text style={styles.title}>Tes genres préférés</Text>
                        <Text style={styles.subtitle}>Sélectionne au moins 3 genres</Text>
                        <View style={styles.genresContainer}>
                            {GENRES.map((genre) => (
                                <TouchableOpacity
                                    key={genre}
                                    style={[
                                        styles.genreChip,
                                        formData.favoriteGenres.includes(genre) && styles.genreChipSelected
                                    ]}
                                    onPress={() => handleGenreToggle(genre)}
                                >
                                    <Text style={[
                                        styles.genreText,
                                        formData.favoriteGenres.includes(genre) && styles.genreTextSelected
                                    ]}>
                                        {genre}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.button, formData.favoriteGenres.length < 3 && styles.buttonDisabled]}
                            onPress={() => setStep(3)}
                            disabled={formData.favoriteGenres.length < 3}
                        >
                            <Text style={styles.buttonText}>Suivant</Text>
                        </TouchableOpacity>
                    </>
                );

            case 3:
                return (
                    <>
                        <Text style={styles.title}>Ton livre préféré ?</Text>
                        <TextInput
                            style={[styles.input, {height: 80}]}
                            placeholder="Ex: Harry Potter à l'école des sorciers"
                            value={formData.favoriteBook}
                            onChangeText={(val) => setFormData({...formData, favoriteBook: val})}
                            multiline
                        />
                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>Créer mon compte</Text>
                            )}
                        </TouchableOpacity>
                    </>
                );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {renderStep()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F2EC' },
    scrollContent: { padding: 24 },
    title: { fontSize: 28, fontWeight: '700', color: '#5A2B18', marginBottom: 12 },
    subtitle: { fontSize: 14, color: '#7A7A7A', marginBottom: 20 },
    input: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        fontSize: 16,
    },
    genresContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
    genreChip: {
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    genreChipSelected: { backgroundColor: '#8B4A2B', borderColor: '#8B4A2B' },
    genreText: { color: '#333' },
    genreTextSelected: { color: 'white' },
    button: { backgroundColor: '#8B4A2B', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 12 },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
});
