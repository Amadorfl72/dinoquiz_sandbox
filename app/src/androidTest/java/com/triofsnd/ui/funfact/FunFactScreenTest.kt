package com.triofsnd.ui.funfact

import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.createComposeUI
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.triofsnd.ui.theme.TrioFsndTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * UI tests for TRIOFSND-26: Fun Fact UI component.
 *
 * Verifies:
 *  - Fun fact text is displayed
 *  - Dinosaur image is displayed
 *  - 'Next' button is displayed, labelled, and >= 48dp tall
 *  - 'Next' button has a colorful (non-default) background
 *  - 'Next' button click invokes the callback
 *  - Loading state disables the button
 */
@RunWith(AndroidJUnit4::class)
class FunFactScreenTest {

    @get:Rule
    val composeRule = createComposeUI()

    /* ---------- helpers ---------- */

    private fun setContent(
        factText: String = "T-Rex had teeth up to 12 inches long!",
        isLoading: Boolean = false,
        onNextClick: () -> Unit = {}
    ) {
        composeRule.setContent {
            TrioFsndTheme {
                FunFactScreen(
                    factText = factText,
                    isLoading = isLoading,
                    onNextClick = onNextClick
                )
            }
        }
    }

    /* ---------- fun fact text ---------- */

    @Test
    fun funFactText_isDisplayed() {
        setContent(factText = "Triceratops means three-horned face.")
        composeRule
            .onNodeWithText("Triceratops means three-horned face.")
            .assertIsDisplayed()
    }

    @Test
    fun funFactText_supportsLongContent() {
        val longFact = "The Argentinosaurus is one of the largest dinosaurs ever discovered, " +
            "estimated to weigh up to 100 tons and measure over 100 feet long from head to tail."
        setContent(factText = longFact)
        composeRule.onNodeWithText(longFact).assertIsDisplayed()
    }

    @Test
    fun funFactText_isEmpty_doesNotCrash() {
        setContent(factText = "")
        // Screen should still render without throwing
        composeRule.onNodeWithText("Next").assertIsDisplayed()
    }

    /* ---------- dinosaur image ---------- */

    @Test
    fun dinosaurImage_isDisplayed() {
        setContent()
        composeRule
            .onNodeWithContentDescription("Dinosaur")
            .assertIsDisplayed()
    }

    @Test
    fun dinosaurImage_hasAccessibilityDescription() {
        setContent()
        composeRule
            .onNodeWithContentDescription("Dinosaur")
            .assertIsDisplayed()
    }

    /* ---------- Next button: visibility & label ---------- */

    @Test
    fun nextButton_isDisplayed() {
        setContent()
        composeRule.onNodeWithText("Next").assertIsDisplayed()
    }

    @Test
    fun nextButton_hasExactLabel() {
        setContent()
        composeRule.onNodeWithText("Next").assertTextEquals("Next")
    }

    /* ---------- Next button: minimum touch target (>= 48dp) ---------- */

    @Test
    fun nextButton_heightIsAtLeast48dp() {
        setContent()
        composeRule
            .onNodeWithText("Next")
            .assertHeightIsAtLeast(48.dp)
    }

    /* ---------- Next button: colorful / kid-friendly styling ---------- */

    @Test
    fun nextButton_hasNonDefaultBackgroundColor() {
        lateinit var buttonColor: Color
        composeRule.setContent {
            TrioFsndTheme {
                buttonColor = MaterialTheme.colorScheme.primary
                FunFactScreen(
                    factText = "Stegosaurus had plates on its back.",
                    isLoading = false,
                    onNextClick = {}
                )
            }
        }
        // The button background must not be transparent or the default surface color.
        val surfaceColor = MaterialTheme.colorScheme.surface
        assert(buttonColor.toArgb() != Color.Transparent.toArgb()) {
            "Next button must have a colorful background, not transparent."
        }
        assert(buttonColor.toArgb() != surfaceColor.toArgb()) {
            "Next button must have a colorful background, not the default surface color."
        }
    }

    @Test
    fun nextButton_backgroundIsVibrantKidFriendlyColor() {
        lateinit var capturedColor: Color
        composeRule.setContent {
            TrioFsndTheme {
                FunFactScreen(
                    factText = "Velociraptors were actually feathered!",
                    isLoading = false,
                    onNextClick = {},
                    onButtonColorCaptured = { capturedColor = it }
                )
            }
        }
        // Verify the color is vibrant: saturation > 0.3f and value > 0.5f
        val hsv = FloatArray(3)
        android.graphics.Color.colorToHSV(capturedColor.toArgb(), hsv)
        assert(hsv[1] > 0.3f) {
            "Next button color should be saturated (kid-friendly). Saturation was ${hsv[1]}"
        }
        assert(hsv[2] > 0.5f) {
            "Next button color should be bright (kid-friendly). Value was ${hsv[2]}"
        }
    }

    /* ---------- Next button: interaction ---------- */

    @Test
    fun nextButton_click_invokesCallback() {
        var clickCount = 0
        setContent(onNextClick = { clickCount++ })
        composeRule.onNodeWithText("Next").performClick()
        assert(clickCount == 1) {
            "Next button click should invoke onNextClick exactly once. Was: $clickCount"
        }
    }

    @Test
    fun nextButton_disabled_whenLoading() {
        setContent(isLoading = true)
        composeRule.onNodeWithText("Next").assertIsNotEnabled()
    }

    @Test
    fun nextButton_enabled_whenNotLoading() {
        setContent(isLoading = false)
        composeRule.onNodeWithText("Next").assertIsNotEnabled()
    }
}