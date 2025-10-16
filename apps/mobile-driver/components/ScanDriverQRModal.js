// apps/mobile-driver/components/ScanDriverQRModal.js
import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function ScanDriverQRModal({ visible, value = "", onClose, onUse }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>Scanned QR</Text>
          <Text style={s.value} numberOfLines={4}>{value || "—"}</Text>
          <View style={s.row}>
            <TouchableOpacity style={[s.btn, s.ghost]} onPress={onClose}>
              <Text style={s.ghostTxt}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btn} onPress={() => onUse?.(value)}>
              <Text style={s.btnTxt}>Use</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:{flex:1,backgroundColor:"rgba(0,0,0,0.5)",alignItems:"center",justifyContent:"center"},
  card:{width:"88%",borderRadius:12,backgroundColor:"#fff",padding:14},
  title:{fontSize:16,fontWeight:"700",marginBottom:8,color:"#111827"},
  value:{fontSize:13,color:"#374151",marginBottom:12},
  row:{flexDirection:"row",gap:10},
  btn:{flex:1,height:42,borderRadius:10,backgroundColor:"#0F172A",alignItems:"center",justifyContent:"center"},
  btnTxt:{color:"#fff",fontWeight:"700"},
  ghost:{backgroundColor:"#E5E7EB"},
  ghostTxt:{color:"#111827",fontWeight:"700"},
});
