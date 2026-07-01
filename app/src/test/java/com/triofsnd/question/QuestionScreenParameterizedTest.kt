package com.triofsnd.question

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@RunWith(Parameterized::class)
class QuestionScreenParameterizedTest(
    private val label: String,
    private val uiState: QuestionUiState,
    private val expectedOptionCount: Int
) {

    @get:Rule
    val composeTestRule = createComposeRule()

    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun data(): Collection<Array<Any>> = listOf(
            arrayOf(
                "Four options",
                QuestionUiState(
                    imageUrl = "https://example.com/dino.png",
                    statement = "Which dinosaur is known as the 'King of the Dinosaurs'?",
                    options = listOf("Tyrannosaurus Rex", "Triceratops", "Velociraptor", "Stegosaurus"),
                    correctOptionIndex = 0
                ),
                4
            ),
            arrayOf(
                "Three options",
                QuestionUiState(
                    imageUrl = "https://example.com/dino.png",
                    statement = "Which dinosaur had three horns?",
                    options = listOf("Triceratops", "Stegosaurus", "Brachiosaurus"),
                    correctOptionIndex = 0
                ),
                3
            ),
            arrayOf(
                "Null image with placeholder",
                QuestionUiState(
                    imageUrl = null,
                    statement = "Which dinosaur was a meat eater?",
                    options = listOf("Tyrannosaurus Rex", "Brachiosaurus", "Triceratops", "Stegosaurus"),
                    correctOptionIndex = 0
                ),
                4
            ),
            arrayOf(
                "Long statement text",
                QuestionUiState(
                    imageUrl = "https://example.com/dino.png",
                    statement = "Which of the following dinosaurs lived during the Late Cretaceous period and is widely recognized by its large skull and powerful bite force?",
                    options = listOf("Tyrannosaurus Rex", "Allosaurus", "Spinosaurus", "Carnotaurus"),
                    correctOptionIndex = 0
                ),
                4
            )
        )
    }

    @Test
    fun questionScreenDisplaysCorrectNumberOfOptions() {
        composeTestRule.setContent {
            QuestionScreen(uiState = uiState, onOptionSelected = {})
        }
        composeTestRule.onAllNodesWithTag("answerOption").assertCountEquals(expectedOptionCount)
    }

    @Test
    fun questionScreenDisplaysStatement() {
        composeTestRule.setContent {
            QuestionScreen(uiState = uiState, onOptionSelected = {})
        }
        composeTestRule.onNodeWithText(uiState.statement).assertIsDisplayed()
    }

    @Test
    fun questionScreenDisplaysAllOptionTexts() {
        composeTestRule.setContent {
            QuestionScreen(uiState = uiState, onOptionSelected = {})
        }
        uiState.options.forEach { option ->
            composeTestRule.onNodeWithText(option).assertIsDisplayed()
        }
    }
}
