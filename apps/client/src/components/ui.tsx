import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, radius, space } from '../theme'

/** Экран с фоном, заголовком и кнопкой «Назад»; scroll — прокручиваемое содержимое */
export function Screen({
  title,
  back,
  scroll = true,
  children,
  right,
}: {
  title?: string
  back?: boolean
  scroll?: boolean
  children: ReactNode
  right?: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const header =
    title || back ? (
      <View style={styles.header}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/menu'))}
            style={styles.backBtn}
            testID="back"
          >
            <Text style={styles.backText}>‹ {t('common.back')}</Text>
          </Pressable>
        ) : null}
        {title ? (
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        <View style={styles.headerRight}>{right}</View>
      </View>
    ) : null
  const content = <View style={styles.content}>{children}</View>
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {header}
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </View>
  )
}

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
  testID,
  small,
}: {
  title: string
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  style?: StyleProp<ViewStyle>
  testID?: string
  small?: boolean
}) {
  const inactive = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        variantStyle[variant],
        inactive && styles.btnDisabled,
        pressed && !inactive && styles.btnPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={[styles.btnText, small && styles.btnTextSmall, variant === 'primary' && styles.btnTextPrimary]}>{title}</Text>
      )}
    </Pressable>
  )
}

const variantStyle: Record<string, ViewStyle> = {
  primary: { backgroundColor: colors.gold, borderColor: colors.goldDark },
  secondary: { backgroundColor: colors.panelAlt, borderColor: colors.border },
  danger: { backgroundColor: '#5a2420', borderColor: colors.red },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function H2({ children, style, testID }: { children: ReactNode; style?: StyleProp<TextStyle>; testID?: string }) {
  return (
    <Text style={[styles.h2, style]} testID={testID}>
      {children}
    </Text>
  )
}

export function P({
  children,
  dim,
  style,
  testID,
}: {
  children: ReactNode
  dim?: boolean
  style?: StyleProp<TextStyle>
  testID?: string
}) {
  return (
    <Text style={[styles.p, dim && styles.dim, style]} testID={testID}>
      {children}
    </Text>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <Text style={styles.error} accessibilityRole="alert" testID="error">
      {children}
    </Text>
  )
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.textDim} style={styles.input} accessibilityLabel={label} {...props} />
    </View>
  )
}

export function Loading() {
  const { t } = useTranslation()
  return (
    <View style={[styles.screen, styles.center]}>
      <ActivityIndicator color={colors.gold} size="large" />
      <Text style={[styles.p, styles.dim, { marginTop: space.md }]}>{t('common.loading')}</Text>
    </View>
  )
}

export function Row({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View style={[styles.row, style]} testID={testID}>
      {children}
    </View>
  )
}

/** Переключатель из нескольких вариантов */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testID,
  scroll,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  testID?: string
  /** Много вариантов: горизонтальная прокрутка вместо деления ширины поровну */
  scroll?: boolean
}) {
  const row = (
    <View style={styles.segmented} testID={testID}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
          style={[styles.segment, scroll && styles.segmentScroll, o.value === value && styles.segmentActive]}
          testID={testID ? `${testID}-${o.value}` : undefined}
        >
          <Text style={[styles.segmentText, o.value === value && styles.segmentTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  )
  return scroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segmentScroller}>
      {row}
    </ScrollView>
  ) : (
    row
  )
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: space.md,
  },
  headerRight: { marginLeft: 'auto' },
  backBtn: { paddingVertical: space.xs, paddingRight: space.sm },
  backText: { color: colors.gold, fontSize: 16 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  scroll: { flexGrow: 1 },
  content: { flex: 1, padding: space.lg, gap: space.md, width: '100%', maxWidth: 960, alignSelf: 'center' },
  btn: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: { minHeight: 32, paddingHorizontal: space.md },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.8 },
  btnText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  btnTextSmall: { fontSize: 14 },
  btnTextPrimary: { color: '#1a1408' },
  card: {
    backgroundColor: colors.panel,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
  },
  h2: { color: colors.text, fontSize: 17, fontWeight: '700' },
  p: { color: colors.text, fontSize: 15 },
  dim: { color: colors.textDim },
  error: { color: colors.red, fontSize: 14 },
  field: { gap: space.xs },
  label: { color: colors.textDim, fontSize: 13 },
  input: {
    backgroundColor: colors.panelAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    color: colors.text,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 16,
    minHeight: 44,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  segmented: { flexDirection: 'row', borderRadius: radius, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  segment: { flex: 1, paddingVertical: space.sm, alignItems: 'center', backgroundColor: colors.panelAlt },
  segmentScroll: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingHorizontal: space.md },
  segmentScroller: { flexGrow: 0 },
  segmentActive: { backgroundColor: colors.goldDark },
  segmentText: { color: colors.textDim, fontWeight: '600' },
  segmentTextActive: { color: colors.text },
})
