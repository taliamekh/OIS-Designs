import { ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import { IconButton, Txt, usePalette } from "./kit";
export default function Sheet({
  title,
  children,
  onClose,
  expanded = false,
  onExpand,
  availableHeight,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  expanded?: boolean;
  onExpand?: () => void;
  availableHeight?: number;
}) {
  const c = usePalette(),
    size = useWindowDimensions();
  return (
    <View
      style={{
        maxHeight: (availableHeight ?? size.height) * (expanded ? 0.82 : 0.52),
        backgroundColor: c.surface,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderTopWidth: 1,
        borderColor: c.line,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      }}
    >
      <View
        style={{
          width: 35,
          height: 4,
          borderRadius: 2,
          backgroundColor: c.line,
          alignSelf: "center",
          marginTop: 8,
        }}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: 20,
          paddingRight: 10,
          gap: 8,
        }}
      >
        <Txt style={{ flex: 1, fontWeight: "600", fontSize: 17 }}>{title}</Txt>
        {onExpand && (
          <IconButton
            name="expand"
            label={expanded ? "Reduce panel" : "Expand panel"}
            onPress={onExpand}
          />
        )}
        <IconButton name="close" label={`Close ${title}`} onPress={onClose} />
      </View>
      {children}
    </View>
  );
}
