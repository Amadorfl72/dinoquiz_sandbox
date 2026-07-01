package com.triofsnd.ui

import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.triofsnd.ui.theme.TrioFSNDTheme
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FunFactScreenSnapshotTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun funFactScreen_rendersWithoutCrash_forKidFriendlyAudience() {
        composeRule.setContent {
            TrioFSNDTheme {
                FunFactScreen(
                    state = FunFactScreenState(
                        fact = "Triceratops had three horns on its head!",
                        onNext = {}
                    )
                )
            }
        }
        composeRule.onNodeWithText("Triceratops had three horns on its head!").assertExists()
        composeRule.onNodeWithContentDescription("Dinosaur").assertExists()
        composeRule.onNodeWithText("Next").assertExists()
    }

    @Test
    fun nextButton_rendersLargeEnoughPixels_forTouchTarget() {
        composeRule.setContent {
            TrioFSNDTheme {
                FunFactScreen(
                    state = FunFactScreenState(fact = "fact", onNext = {})
                )
            }
        }
        val image = composeRule.onNodeWithText("Next").captureToImage()
        assertTrue("Next button should render with width", image.width >= 48)
        assertTrue("Next button should render with height", image.height >= 48)
    }
}
