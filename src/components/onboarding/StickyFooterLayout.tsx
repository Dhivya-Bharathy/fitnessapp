import { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { spacing } from '../../theme';
import { useMobileScrollProps } from '../../hooks/useMobileScrollProps';
import { useFooterInset } from '../../hooks/useFooterInset';

type Props = {
  backgroundColor: string;
  header?: ReactNode;
  footer?: ReactNode | null;
  children: ReactNode;
  /** Extra bottom padding inside scroll (above footer). */
  scrollPaddingBottom?: number;
  padHorizontal?: boolean;
};

/**
 * Standard mobile onboarding layout: fixed header, scrollable body, one sticky footer CTA.
 */
export function StickyFooterLayout({
  backgroundColor,
  header,
  footer,
  children,
  scrollPaddingBottom = spacing.md,
  padHorizontal = true,
}: Props) {
  const footerInset = useFooterInset(spacing.sm);
  const { scrollViewStyle, scrollProps } = useMobileScrollProps();

  return (
    <AndroidSafeView backgroundColor={backgroundColor} style={styles.safe}>
      <View style={styles.column}>
        {header}
        <ScrollView
          style={[styles.scroll, scrollViewStyle]}
          contentContainerStyle={[
            styles.scrollContent,
            padHorizontal && styles.scrollPadH,
            { paddingBottom: scrollPaddingBottom },
          ]}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={Platform.OS === 'web'}
          {...scrollProps}
        >
          {children}
        </ScrollView>
        {footer != null ? (
          <View style={[styles.footer, { paddingBottom: footerInset, backgroundColor }]}>
            {footer}
          </View>
        ) : null}
      </View>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  column: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  scrollPadH: { paddingHorizontal: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.22)',
    ...Platform.select({
      web: { boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' as unknown as number },
      default: { elevation: 8 },
    }),
  },
});
