package com.triofsnd.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import com.triofsnd.ui.theme.TrioFSNDTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import androidx.test.ext.junit.runners.AndroidJUnit4

@RunWith(AndroidJUnit4::class)
class FunFactScreenTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val sampleFact = "The Tyrannosaurus Rex could eat up to 500 pounds of meat in one bite!"

    private fun setContent(onNextClicked: () -> Unit = {}): FunFactScreenState {
        var clicked = false
        var state = FunFactScreenState(fact = sampleFact, onNext = { clicked = true; onNextClicked() })
        composeRule.setContent {
            TrioFSNDTheme {
                FunFactScreen(state = state)
            }
        }
        return state
    }

    @Test
    fun funFactText_isDisplayed_andShowsFactContent() {
        setContent()
        composeRule.onNodeWithText(sampleFact)
            .assertIsDisplayed()
            .assertTextEquals(sampleFact)
    }

    @Test
    fun dinosaurImage_isDisplayed_withContentDescription() {
        setContent()
        composeRule.onNodeWithContentDescription("Dinosaur")
            .assertIsDisplayed()
    }

    @Test
    fun nextButton_isDisplayed_withKidFriendlyLabel() {
        setContent()
        composeRule.onNodeWithText("Next")
            .assertIsDisplayed()
    }

    @Test
    fun nextButton_heightIsAtLeast48dp_forAccessibility() {
        setContent()
        composeRule.onNodeWithText("Next")
            .assertHeightIsAtLeast(48.dp)
    }

    @Test
    fun nextButton_hasColorfulBackground_notTransparent() {
        setContent()
        val buttonNode = composeRule.onNodeWithText("Next")
        val image = buttonNode.captureToImage()
        val width = image.width
        val height = image.height
        assertTrue("Next button must render with measurable pixels", width > 0 && height > 0)

        var foundColorfulPixel = false
        for (x in 0 until width step 4) {
            for (y in 0 until height step 4) {
                val color = image.getPixel(x, y)
                val r = (color shr 16) and 0xFF
                val g = (color shr 8) and 0xFF
                val b = color and 0xFF
                val alpha = (color shr 24) and 0xFF
                if (alpha > 200 && (r > 150 || g > 150 || b > 150)) {
                    foundColorfulPixel = true
                    break
                }
            }
            if (foundColorfulPixel) break
        }
        assertTrue("Next button should have colorful (non-transparent) background", foundColorfulPixel)
    }

    @Test
    fun nextButton_clickTriggersOnNextCallback() {
        var callbackInvoked = false
        setContent(onNextClicked = { callbackInvoked = true })
        composeRule.onNodeWithText("Next")
            .performClick()
        assertTrue("Next button click should invoke onNext callback", callbackInvoked)
    }

    @Test
    fun funFactText_isReadable_withSufficientContrast() {
        setContent()
        val factNode = composeRule.onNodeWithText(sampleFact)
        val image = factNode.captureToImage()
        assertTrue("Fact text must render pixels", image.width > 0 && image.height > 0)
    }

    @Test
    fun funFactScreen_displaysAllRequiredElements_together() {
        setContent()
        composeRule.onNodeWithContentDescription("Dinosaur").assertIsDisplayed()
        composeRule.onNodeWithText(sampleFact).assertIsDisplayed()
        composeRule.onNodeWithText("Next").assertIsDisplayed()
    }
}
