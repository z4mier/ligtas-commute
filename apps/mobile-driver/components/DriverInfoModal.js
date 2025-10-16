// apps/mobile-driver/components/DriverInfoModal.js
import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

export default function DriverInfoModal({ visible, driver = {}, onClose }) {
  const { name = "Unknown", bus = "—", rating = 0, photo } = driver;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.header}>
            {photo ? <Image source={{ uri: photo }} style={s.avatar} /> : <View style={s.avatar} />}
            <View style={{ flex:1 }}>
              <Text style={s.name}>{name}</Text>
              <Text style={s.sub}>Bus: {bus}</Text>
              <Text style={s.sub}>Rating: {rating}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.btn} onPress={onClose}>
            <Text style={s.btnTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:{flex:1,backgroundColor:"rgba(0,0,0,0.5)",alignItems:"center",justifyContent:"center"},
  card:{width:"88%",borderRadius:12,backgroundColor:"#fff",padding:14},
  header:{flexDirection:"row",gap:12,marginBottom:12,alignItems:"center"},
  avatar:{width:56,height:56,borderRadius:12,backgroundColor:"#E5E7EB"},
  name:{fontSize:16,fontWeight:"700",color:"#111827"},
  sub:{fontSize:12,color:"#6B7280",marginTop:2},
  btn:{height:42,borderRadius:10,backgroundColor:"#0F172A",alignItems:"center",justifyContent:"center"},
  btnTxt:{color:"#fff",fontWeight:"700"},
});
