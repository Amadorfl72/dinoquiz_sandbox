package com.example.triofsnd

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QuestionScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val minTouchTarget = 48.dp

    @Test
    fun questionScreen_displaysDinosaurImage() {
        composeTestRule.setContent {
            QuestionScreen(
                statement = "Which dinosaur is known for its three horns?",
                options = listOf("Tyrannosaurus Rex", "Triceratops", "Stegosaurus"),
                imageUrl = "https://example.com/triceratops.png"
            )
        }
        composeTestRule.onNodeWithTag("DinosaurImage").assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysPlaceholderWhenImageUrlIsNull() {
        composeTestRule.setContent {
            QuestionScreen(
                statement = "Which dinosaur is known for its three horns?",
                options = listOf("Tyrannosaurus Rex", "Triceratops", "Stegosaurus"),
                imageUrl = null
            )
        }
        composeTestRule.onNodeWithTag("DinosaurPlaceholder").assertIsDisplayed()
    }

    @Test
    fun questionScreen_statementIsDisplayed() {
        val statement = "Which dinosaur is known for its three horns?"
        composeTestRule.setContent {
            QuestionScreen(
                statement = statement,
                options = listOf("Tyrannosaurus Rex", "Triceratops", "Stegosaurus"),
                imageUrl = "https://example.com/triceratops.png"
            )
        }
        composeTestRule.onNodeWithTag("QuestionStatement").assertIsDisplayed()
        composeTestRule.onNodeWithText(statement).assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysThreeAnswerOptions() {
        composeTestRule.setContent {
            QuestionScreen(
                statement = "Which dinosaur is known for its three horns?",
                options = listOf("Tyrannosaurus Rex", "Triceratops", "Stegosaurus"),
                imageUrl = "https://example.com/triceratops.png"
            )
        }
        composeTestRule.onNodeWithTag("AnswerOption_0").assertIsDisplayed()
        composeTestRule.onNodeWithTag("AnswerOption_1").assertIsDisplayed()
        composeTestRule.onNodeWithTag("AnswerOption_2").assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysFourAnswerOptions() {
        composeTestRule.setContent {
            QuestionScreen(
                statement = "Which dinosaur is known for its three horns?",
                options = listOf("Tyrannosaurus Rex", "Triceratops", "Stegosaurus", "Brachiosaurus"),
                imageUrl = "https://example.com/triceratops.png"
            )
        }
        composeTestRule.onNodeWithTag("AnswerOption_0").assertIsDisplayed()
        composeTestRule.onNodeWithTag("AnswerOption_1").assertIsDisplayed()
        composeTestRule.onNodeWithTag("AnswerOption_2").assertIsDisplayed()
        composeTestRule.onNodeWithTag("AnswerOption_3").assertIsDisplayed()
    }

    @Test
    fun answerOptions_meetMinimum48dpTouchTargetSize() {
        composeTestRule.setContent {
            QuestionScreen(
                statement = "Which dinosaur is known for its three horns?",
                options = listOf("Tyrannosaurus Rex", "Triceratops", "Stegosaurus"),
                imageUrl = "https://example.com/triceratops.png"
            )
        }

        val minTouchTargetPx = with(composeTestRule.density) { minTouchTarget.toPx() }

        for (i in 0 until 3) {
            val node = composeTestRule.onNodeWithTag("AnswerOption_$i").fetchSemanticsNode()
            val bounds = node.boundsInWindow
            assertTrue("Option $i width is less than 48dp", bounds.width >= minTouchTargetPx)
            assertTrue("Option $i height is less than 48dp", bounds.height >= minTouchTargetPx)
        }
    }

    @Test
    fun questionScreen_responsiveLayout_doesNotOverflowOnSmallDevices() {
        composeTestRule.setContent {
            // Simulate a small device width constraint if applicable, or just verify layout bounds
            QuestionScreen(
                statement = "Which dinosaur is known for its three horns?",
                options = listOf("Tyrannosaurus Rex", "Triceratops", "Stegosaurus"),
                imageUrl = "https://example.com/triceratops.png"
            )
        }
        
        val screenWidth = composeTestRule.onNodeWithTag("QuestionScreenRoot").fetchSemanticsNode().boundsInWindow.width
        val statementWidth = composeTestRule.onNodeWithTag("QuestionStatement").fetchSemanticsNode().boundsInWindow.width
        
        assertTrue("Statement overflows screen width", statementWidth <= screenWidth)
    }
}
