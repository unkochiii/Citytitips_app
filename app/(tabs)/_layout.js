import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import BookScreen from './BookScreen';
import App from './index';
import Profile from "./Profile"


const Layout = () => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <View style={styles.container}>
      {/* Contenu principal */}
      <View style={styles.content}>
        {activeTab === 'home' && <App/> }
        {activeTab === 'search' && <BookScreen/>} 
        {activeTab === 'profile' && <Profile/>}
        {activeTab === 'chat' && <Text>Page de chat</Text> }
      </View>

      {/* Bottom Tabs */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('home')}
          style={activeTab === 'home' ? styles.navItemActive : styles.navItem}
        >
          <MaterialCommunityIcons name="cards-heart" size={28} color="#D35400" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('search')}
          style={activeTab === 'search' ? styles.navItemActive : styles.navItem}
        >
          <MaterialCommunityIcons name="binoculars" size={28} color="#D35400" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('profile')}
          style={activeTab === 'profile' ? styles.navItemActive : styles.navItem}
        >
          <Ionicons name="person-circle-outline" size={32} color="#D35400" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('chat')}
          style={activeTab === 'chat' ? styles.navItemActive : styles.navItem}
        >
          <Ionicons name="chatbubbles-outline" size={28} color="#D35400" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Layout;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bottomBar: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navItemActive: {
    alignItems: 'center',
    justifyContent: 'center',
    // effet visuel onglet actif
  },
});
