// apps/mobile/components/LCText.js
import React from "react";
import { Text } from "react-native";

const SIZES = {
  title: 18,      
  heading: 16,    
  body: 12,     
  label: 12,      
  tiny: 10,      
};

export default function LCText({ variant = "body", style, ...rest }) {
  return (
    <Text
      allowFontScaling={false}              
      style={[{ fontSize: SIZES[variant] || SIZES.body }, style]}
      {...rest}
    />
  );
}
