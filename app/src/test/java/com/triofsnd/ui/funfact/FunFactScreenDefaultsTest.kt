package com.triofsnd.ui.funfact

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests verifying the kid-friendly color palette and sizing constants
 * defined for the Fun Fact screen (TRIOFSND-26).
 */
class FunFactScreenDefaultsTest {

    @Test
    fun nextButtonMinHeight_isAtLeast48dp() {
        assertTrue(
            "Next button minimum height must be >= 48dp for accessibility",
            FunFactScreenDefaults.NextButtonMinHeight >= 48
        )
    }

    @Test
    fun nextButtonColor_isVibrant() {
        val color = FunFactScreenDefaults.NextButtonColor
        val hsv = FloatArray(3)
        android.graphics.Color.colorToHSV(color.toArgb(), hsv)
        assertTrue(
            "Next button color should be saturated for kid-friendly appeal. Sat=${hsv[1]}",
            hsv[1] > 0.3f
        )
        assertTrue(
            "Next button color should be bright for kid-friendly appeal. Val=${hsv[2]}",
            hsv[2] > 0.5f
        )
    }

    @Test
    fun nextButtonColor_isNotTransparent() {
        val color = FunFactScreenDefaults.NextButtonColor
        assertTrue(color.alpha > 0f)
    }

    @Test
    fun nextButtonTextColor_contrastsWithBackground() {
        val bg = FunFactScreenDefaults.NextButtonColor
        val fg = FunFactScreenDefaults.NextButtonTextColor
        // Simple luminance contrast check
        val bgLum = 0.299f * bg.red + 0.587f * bg.green + 0.114f * bg.blue
        val fgLum = 0.299f * fg.red + 0.587f * fg.green + 0.114f * fg.blue
        val contrast = kotlin.math.abs(bgLum - fgLum)
        assertTrue(
            "Text color should contrast with button background. Contrast=$contrast",
            contrast > 0.3f
        )
    }

    @Test
    fun dinosaurImageContentDescription_isMeaningful() {
        assertEquals("Dinosaur", FunFactScreenDefaults.DinosaurImageContentDescription)
    }
}
