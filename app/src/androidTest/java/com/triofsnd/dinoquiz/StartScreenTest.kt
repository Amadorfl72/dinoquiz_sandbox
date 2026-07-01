package com.triofsnd.dinoquiz

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StartScreenTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun startScreen_displaysDinoQuizTitle() {
        composeTestRule.onNodeWithText("DinoQuiz").assertIsDisplayed()
    }

    @Test
    fun startScreen_displaysDinosaurIllustration() {
        composeTestRule.onNodeWithTag("DinosaurIllustration").assertIsDisplayed()
    }

    @Test
    fun startScreen_displaysPlayButton() {
        composeTestRule.onNodeWithText("¡Jugar!").assertIsDisplayed()
    }

    @Test
    fun startScreen_playButton_isAtLeast64dpHigh() {
        composeTestRule.onNodeWithText("¡Jugar!")
            .assertHeightIsAtLeast(64.dp)
    }

    @Test
    fun startScreen_rendersInLessThan3Seconds() {
        val renderTimeMillis = measureTimeMillis {
            composeTestRule.waitForIdle()
            composeTestRule.onNodeWithText("DinoQuiz").assertIsDisplayed()
        }
        assertTrue("Start screen should render in <3s (3000ms), but took $renderTimeMillis ms", renderTimeMillis < 3000)
    }
}
