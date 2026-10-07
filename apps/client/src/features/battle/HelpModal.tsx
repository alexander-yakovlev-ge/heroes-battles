import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { HERO_INITIATIVE } from '@hb/game-core'
import { Button } from '../../components/ui'
import { colors, radius, space } from '../../theme'

const KEYS = ['helpTurns', 'helpAttack', 'helpWait', 'helpDefend', 'helpRanged', 'helpShootMove', 'helpRoles', 'helpStats', 'helpMana'] as const

/** Справка по бою: очередь, атака в два нажатия, действия, штрафы, роли */
export function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={s.bg}>
        <View style={s.box} testID="help">
          <Text style={s.title}>{t('battle.help')}</Text>
          <ScrollView style={s.scroll} contentContainerStyle={{ gap: space.sm }}>
            {KEYS.map((k) => (
              <Text key={k} style={s.line}>
                • {t(`battle.${k}`, { init: HERO_INITIATIVE })}
              </Text>
            ))}
          </ScrollView>
          <Button title={t('common.close')} onPress={onClose} testID="help-close" />
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  box: { backgroundColor: colors.panel, borderRadius: radius * 2, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.md, maxWidth: 560, width: '100%', maxHeight: '90%' },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  scroll: { flexGrow: 0 },
  line: { color: colors.text, fontSize: 14, lineHeight: 20 },
})
