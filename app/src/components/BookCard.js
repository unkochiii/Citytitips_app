import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.65;

export default function BookCardModern({ book, onLike }) {
    return (
        <View style={styles.card}>
            <View style={styles.miniCard}>
                <Image
                    source={{ uri: book.cover }}
                    style={styles.miniCover}
                    contentFit="cover"
                />
                <Text style={styles.miniLabel}>Référence</Text>
            </View>

            <View style={styles.coverWrapper}>
                <Image
                    source={{ uri: book.cover }}
                    style={styles.cover}
                    contentFit="contain"
                />
            </View>

            <View style={styles.info}>
                <Text style={styles.author}>{book.author}</Text>
                <Text style={styles.title} numberOfLines={2}>
                    {book.title}
                </Text>

                <View style={styles.tagsRow}>
                    {book.tags?.map((tag, i) => (
                        <View key={i} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.reason} numberOfLines={2}>
                    Recommandé car {book.suggestionReason}
                </Text>

                <TouchableOpacity style={styles.likeButton} onPress={onLike}>
                    <Ionicons name="thumbs-up-outline" size={22} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: width * 0.9,
        height: CARD_HEIGHT,
        borderRadius: 22,
        backgroundColor: 'white',
        marginTop: 10,
        alignSelf: 'center',
        paddingHorizontal: 18,
        paddingVertical: 16,

        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },

    /* Mini-carte */
    miniCard: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 70,
        height: 100,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
        zIndex: 99,
    },
    miniCover: {
        width: '100%',
        height: 80,
        borderRadius: 8,
    },
    miniLabel: {
        fontSize: 10,
        textAlign: 'center',
        marginTop: 2,
        color: '#444',
        fontWeight: '600',
    },

    /* Cover centrée */
    coverWrapper: {
        flex: 1.1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cover: {
        width: '70%',          // largeur relative à la carte
        aspectRatio: 2 / 3,    // ratio typique d’un livre
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 6,
    },

    /* Infos en bas */
    info: {
        flex: 0.9,
        marginTop: 10,
        justifyContent: 'space-between',
    },
    author: {
        fontSize: 15,
        color: '#7A7A7A',
        fontWeight: '500',
    },
    title: {
        fontSize: 22,
        color: '#5A2B18',
        fontWeight: '700',
        marginTop: 4,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    tag: {
        backgroundColor: '#F5E6DC',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 6,
    },
    tagText: {
        fontSize: 11,
        color: '#8B4A2B',
        fontWeight: '500',
    },
    reason: {
        fontSize: 13,
        color: '#7A7A7A',
        marginTop: 8,
    },
    likeButton: {
        alignSelf: 'flex-end',
        backgroundColor: '#8B4A2B',
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
});