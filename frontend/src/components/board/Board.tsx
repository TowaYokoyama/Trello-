import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';

// --- Type Definitions ---
interface Card {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  list_id: number;
}

interface List {
  id: number;
  title: string;
  board_id: number;
  cards: Card[];
}

interface BoardProps {
  lists: List[];
  onCardPress: (card: Card, listId: number) => void;
  getListEmoji: (index: number) => string;
  handleDeleteList: (listId: number) => void;
  handleAddCard: (listId: number, cardTitle: string) => void;
  handleToggleCardComplete: (listId: number, card: Card) => void;
  handleDeleteCard: (listId: number, cardId: number) => void;
}

interface CardItemProps {
  card: Card;
  onCardPress: (card: Card, listId: number) => void;
  listId: number;
  onToggle: () => void;
  onDelete: () => void;
}

interface AddCardInputProps {
  listId: number;
  handleAddCard: (listId: number, cardTitle: string) => void;
}

const { height } = Dimensions.get('window');

// --- AddCardInput Component ---
const AddCardInput = ({ listId, handleAddCard }: AddCardInputProps) => {
  const [cardTitle, setCardTitle] = useState('');

  const handleSubmit = () => {
    if (cardTitle.trim()) {
      handleAddCard(listId, cardTitle);
      setCardTitle('');
    }
  };

  return (
    <View style={styles.addCardContainer}>
      <TextInput
        style={styles.addCardInput}
        placeholder="新しいカードを追加..."
        value={cardTitle}
        onChangeText={(text) => setCardTitle(text)}
        onSubmitEditing={handleSubmit}
      />
    </View>
  );
};

// --- Card Component ---
const CardItem = ({ card, onCardPress, listId, onToggle, onDelete }: CardItemProps) => {
  return (
    <TouchableOpacity onPress={() => onCardPress(card, listId)} style={styles.cardItem}>
      <View style={styles.cardContent}>
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); onToggle(); }}>
          <View style={[styles.checkbox, card.completed && styles.checkboxCompleted]}>
            {card.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>
        <Text style={[styles.cardText, card.completed && styles.cardTextCompleted]}>{card.title}</Text>
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); onDelete(); }} style={styles.deleteCardButton}>
          <Text style={styles.deleteCardButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// --- Board Component ---
export default function Board({ 
  lists, 
  onCardPress,
  getListEmoji, 
  handleDeleteList, 
  handleAddCard, 
  handleToggleCardComplete,
  handleDeleteCard,
}: BoardProps) {

  const renderList = ({ item: list, index }: { item: List, index: number }) => {
    return (
      <View style={styles.listCard}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{getListEmoji(index)} {list.title}</Text>
          <TouchableOpacity onPress={() => handleDeleteList(list.id)} style={styles.deleteListButton}><Text style={styles.deleteListButtonText}>🗑️</Text></TouchableOpacity>
        </View>
        
        <ScrollView style={styles.cardsContainer}>
          {list.cards.map(card => (
            <CardItem 
              key={card.id} 
              card={card} 
              onCardPress={onCardPress} 
              listId={list.id} 
              onToggle={() => handleToggleCardComplete(list.id, card)}
              onDelete={() => handleDeleteCard(list.id, card.id)}
            />
          ))}
        </ScrollView>

        <AddCardInput listId={list.id} handleAddCard={handleAddCard} />
      </View>
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {lists.map((list, index) => (
        <View key={list.id}>
          {renderList({ item: list, index })}
        </View>
      ))}
    </ScrollView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  listCard: { width: 320, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 25, padding: 20, marginRight: 15, height: height * 0.65 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  listTitle: { fontSize: 22, fontWeight: 'bold', color: '#64ffda', flex: 1 },
  deleteListButton: { padding: 8, borderRadius: 15, backgroundColor: 'rgba(255, 82, 82, 0.2)' },
  deleteListButtonText: { fontSize: 18 },
  cardsContainer: { flex: 1, marginBottom: 20 },
  cardItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#64ffda',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
      },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      }
    })
  },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardText: { flex: 1, fontSize: 16, color: '#1a1a2e', fontWeight: '600', lineHeight: 22 },
  cardTextCompleted: { textDecorationLine: 'line-through', color: '#6B7280' },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#64ffda', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  checkboxCompleted: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  checkmark: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  deleteCardButton: { padding: 5 },
  deleteCardButtonText: { fontSize: 18, color: '#ff5252', fontWeight: 'bold' },
  addCardContainer: { backgroundColor: 'rgba(100, 255, 218, 0.15)', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(100, 255, 218, 0.3)' },
  addCardInput: { color: '#64ffda', fontSize: 16, paddingVertical: 15, fontWeight: '500' },
});