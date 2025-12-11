import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MOCK_BOOKS } from './constants/book';
import BookCard from './components/BookCard';

export default function App() {
    const [isMasked, setIsMasked] = useState(false);
    const [cardIndex, setCardIndex] = useState(0);

    // Fonction appelée quand on swipe une carte
    const onSwiped = (index) => {
        setCardIndex(index + 1);
        setIsMasked(false); // Reset le masque pour la prochaine carte
    };

    return (
        <SafeAreaView style={styles.container}>

            {/* 1. Bouton Recherche (Loupe) en haut à droite */}
            <TouchableOpacity style={styles.searchButton}>
                <Ionicons name="search" size={24} color="#D35400" />
            </TouchableOpacity>

            {/* 2. Le Deck de Swipe */}
            <View style={styles.swiperContainer}>
                <Swiper
                    cards={MOCK_BOOKS}
                    renderCard={(card) => (
                        <BookCard
                            book={card}
                            isMasked={isMasked}
                            onToggleMask={() => setIsMasked(!isMasked)}
                        />
                    )}
                    onSwiped={onSwiped}
                    onSwipedRight={() => console.log('LIKE -> Wishlist')}
                    onSwipedLeft={() => console.log('DISLIKE')}
                    cardIndex={cardIndex}
                    backgroundColor={'transparent'}
                    stackSize={3} // Nombre de cartes visibles en dessous
                    cardVerticalMargin={0}
                    cardHorizontalMargin={0}
                    animateCardOpacity
                    swipeBackCard
                />
            </View>

            {/* 3. Barre de Navigation (Bottom Bar) */}
            <View style={styles.bottomBar}>
                {/* Onglet Actif (Swipe) */}
                <TouchableOpacity style={styles.navItemActive}>
                    <MaterialCommunityIcons name="cards-heart" size={28} color="#D35400" />
                </TouchableOpacity>

                {/* Onglet Recherche (Jumelles) */}
                <TouchableOpacity style={styles.navItem}>
                    <MaterialCommunityIcons name="binoculars" size={28} color="#D35400" />
                </TouchableOpacity>

                {/* Onglet Profil (Bonhomme) */}
                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name="person-circle-outline" size={32} color="#D35400" />
                </TouchableOpacity>

                {/* Onglet Chat (Bulles) */}
                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name="chatbubbles-outline" size={28} color="#D35400" />
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5', // Fond clair
    },
    searchButton: {
        position: 'absolute',
        top: 50, // Ajuster selon safe area
        right: 20,
        zIndex: 100, // Au dessus de tout
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 10,
        borderRadius: 25,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    swiperContainer: {
        flex: 1,
        // Le swiper prend tout l'espace sauf la barre du bas
    },
    bottomBar: {
        height: 80,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'black', // Barre noire comme sur l'image
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20, // Pour iPhone X et +
    },
    navItem: {
        padding: 10,
        opacity: 0.6,
    },
    navItemActive: {
        padding: 10,
        backgroundColor: 'white', // Cercle blanc pour l'actif
        borderRadius: 50,
    }
});
