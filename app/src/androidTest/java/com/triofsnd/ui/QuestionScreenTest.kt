package com.triofsnd.ui

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QuestionScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private fun setupScreen(
        imageUrl: String = "https://example.com/dino.png",
        statement: String = "What dinosaur is this?",
        options: List<String> = listOf("T-Rex", "Triceratops", "Stegosaurus")
    ) {
        composeTestRule.setContent {
            QuestionScreen(
                imageUrl = imageUrl,
                statement = statement,
                options = options
            )
        }
    }

    @Test
    fun questionScreen_displaysDinosaurImage() {
        setupScreen()
        composeTestRule.onNodeWithTag("DinosaurImage").assertExists()
    }

    @Test
    fun questionScreen_displaysPlaceholderWhenImageUrlIsEmpty() {
        setupScreen(imageUrl = "")
        composeTestRule.onNodeWithTag("DinosaurPlaceholder").assertExists()
        composeTestRule.onNodeWithTag("DinosaurImage").assertDoesNotExist()
    }

    @Test
    fun questionScreen_displaysStatement() {
        setupScreen()
        composeTestRule.onNodeWithTag("QuestionStatement").assertExists()
        composeTestRule.onNodeWithText("What dinosaur is this?").assertExists()
    }

    @Test
    fun questionScreen_displaysThreeToFourAnswerOptions() {
        setupScreen(options = listOf("T-Rex", "Triceratops", "Stegosaurus"))
        composeTestRule.onAllNodesWithTag("AnswerOption").assertCountEquals(3)

        setupScreen(options = listOf("T-Rex", "Triceratops", "Stegosaurus", "Brachiosaurus"))
        composeTestRule.onAllNodesWithTag("AnswerOption").assertCountEquals(4)
    }

    @Test
    fun questionScreen_answerOptionsMaintain48dpTouchArea() {
        setupScreen(options = listOf("T-Rex", "Triceratops", "Stegosaurus", "Brachiosaurus"))
        
        val minTouchSizePx = with(composeTestRule.density) { 48.dp.toPx() }
        
        composeTestRule.onAllNodesWithTag("AnswerOption").fetchSemanticsNodes().forEach { node ->
            val bounds = node.boundsInRoot
            assert(bounds.width >= minTouchSizePx) {
                "Answer option width ${bounds.width}px is less than 48dp ($minTouchSizePx px)"
            }
            assert(bounds.height >= minTouchSizePx) {
                "Answer option height ${bounds.height}px is less than 48dp ($minTouchSizePx px)"
            }
        }
    }
}
