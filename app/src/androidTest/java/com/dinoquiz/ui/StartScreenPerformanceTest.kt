package com.dinoquiz.ui

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.assertIsDisplayed
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import com.dinoquiz.ui.start.StartScreen
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@LargeTest
class StartScreenPerformanceTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun startScreen_rendersWithin3Seconds_acrossMultipleIterations() {
        val renderTimes = mutableListOf<Long>()

        repeat(5) { iteration ->
            val startTime = System.currentTimeMillis()
            composeTestRule.setContent {
                StartScreen(onPlayClick = {})
            }
            composeTestRule.onNodeWithText("DinoQuiz").assertIsDisplayed()
            composeTestRule.onNodeWithTag("DinosaurIllustration").assertIsDisplayed()
            composeTestRule.onNodeWithText("¡Jugar!").assertIsDisplayed()
            val elapsed = System.currentTimeMillis() - startTime
            renderTimes.add(elapsed)
        }

        val maxRenderTime = renderTimes.maxOrNull() ?: 0L
        assert(maxRenderTime < 3000L) {
            "Max render time was ${maxRenderTime}ms across iterations: $renderTimes"
        }
    }

    @Test
    fun startScreen_firstFrameAppearsQuickly() {
        val startTime = System.currentTimeMillis()
        composeTestRule.setContent {
            StartScreen(onPlayClick = {})
        }
        composeTestRule.waitForIdle()
        val elapsed = System.currentTimeMillis() - startTime
        assert(elapsed < 3000L) {
            "First frame should appear in <3s, took ${elapsed}ms"
        }
    }
}
